import type { ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import type { cosmos, GetFeeDataInput, osmosis } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import {
  getMinimumCryptoHuman,
  getRateInfo,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import type { OsmosisSupportedChainId } from 'lib/swapper/swappers/OsmosisSwapper/utils/types'

import { DEFAULT_SOURCE } from '../utils/constants'

export const getTradeQuote = async (
  input: GetTradeQuoteInput,
  { sellAssetUsdRate }: { sellAssetUsdRate: string },
): Promise<Result<TradeQuote<ChainId>, SwapErrorRight>> => {
  const {
    accountNumber,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
  } = input
  if (!sellAmountCryptoBaseUnit) {
    return Err(
      makeSwapErrorRight({
        message: 'sellAmount is required',
        code: SwapErrorType.RESPONSE_ERROR,
      }),
    )
  }

  const adapterManager = getChainAdapterManager()

  const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl } = getConfig()

  const maybeRateInfo = await getRateInfo(
    sellAsset.symbol,
    buyAsset.symbol,
    sellAmountCryptoBaseUnit !== '0' ? sellAmountCryptoBaseUnit : '1',
    osmoUrl,
  )

  if (maybeRateInfo.isErr()) return Err(maybeRateInfo.unwrapErr())
  const { buyAssetTradeFeeCryptoBaseUnit, rate, buyAmountCryptoBaseUnit } = maybeRateInfo.unwrap()

  const minimumCryptoHuman = getMinimumCryptoHuman(sellAssetUsdRate)

  const osmosisAdapter = adapterManager.get(osmosisChainId) as osmosis.ChainAdapter | undefined
  const cosmosAdapter = adapterManager.get(cosmosChainId) as cosmos.ChainAdapter | undefined

  if (!osmosisAdapter || !cosmosAdapter)
    return Err(
      makeSwapErrorRight({
        message: 'Failed to get Cosmos SDK adapters',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
  const feeData = await osmosisAdapter.getFeeData(getFeeDataInput)
  const fee = feeData.fast.txFee

  const sellAssetIsOnOsmosisNetwork = sellAsset.chainId === osmosisChainId
  const ibcSwapfeeDeduction = await (sellAssetIsOnOsmosisNetwork
    ? osmosisAdapter.getFeeData(getFeeDataInput)
    : cosmosAdapter.getFeeData(getFeeDataInput))

  return Ok({
    minimumCryptoHuman,
    steps: [
      {
        allowanceContract: '',
        buyAsset,
        feeData: {
          networkFeeCryptoBaseUnit: fee,
          protocolFees: {
            // Note, the current implementation is a hack where we consider the whole swap as one hop
            // This is only there to make the fees correct in the UI, but this isn't a "protocol fee", it's a network fee for the second hop (the IBC transfer)
            ...(sellAssetIsOnOsmosisNetwork
              ? {}
              : {
                  [buyAsset.assetId]: {
                    amountCryptoBaseUnit: buyAssetTradeFeeCryptoBaseUnit,
                    requiresBalance: true,
                    asset: buyAsset,
                  },
                }),
            // When doing an IBC transfer, there is a fee occuring on the amount being transferred.
            // We never accounted for it previously, thus the second hop for ATOM -> OSMO would consistently fail on the first try
            // and "magically" work after a failed trade, since you now have balance to cover the fee deduction
            [sellAsset.assetId]: {
              amountCryptoBaseUnit: ibcSwapfeeDeduction.fast.txFee,
              requiresBalance: false,
              asset: sellAsset,
            },
          },
        },
        accountNumber,
        rate,
        sellAsset,
        sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
        buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
        sources: DEFAULT_SOURCE,
      },
    ],
  })
}
