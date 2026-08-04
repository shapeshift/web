import { tronAssetId, tronChainId } from '@shapeshiftoss/caip'

import type { GetUnsignedTronTransactionArgs } from '../../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../../utils'
import { estimateSunioNetworkFeeCryptoBaseUnit } from './estimateSunioNetworkFee'

export const getSunioTransactionFees = async ({
  tradeQuote,
  stepIndex,
  from,
  slippageTolerancePercentageDecimal,
  assertGetTronChainAdapter,
  config,
}: GetUnsignedTronTransactionArgs): Promise<string> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  const storedNetworkFeeCryptoBaseUnit = step.feeData.networkFeeCryptoBaseUnit
  const route = step.sunioTransactionData?.route

  if (!route) {
    if (!storedNetworkFeeCryptoBaseUnit) throw new Error('Missing network fee in quote')
    return storedNetworkFeeCryptoBaseUnit
  }

  try {
    const adapter = assertGetTronChainAdapter(tronChainId)

    return await estimateSunioNetworkFeeCryptoBaseUnit({
      rpcUrl: adapter.httpProvider.getRpcUrl(),
      apiKey: config.VITE_TRON_GRID_API_KEY,
      route,
      sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      isSellingNativeTrx: step.sellAsset.assetId === tronAssetId,
      address: from,
      slippageTolerancePercentageDecimal,
    })
  } catch {
    if (!storedNetworkFeeCryptoBaseUnit) throw new Error('Missing network fee in quote')
    return storedNetworkFeeCryptoBaseUnit
  }
}
