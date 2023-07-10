import type { ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import type { cosmos, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { osmosis } from '@shapeshiftoss/chain-adapters'
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
    sellAmountCryptoBaseUnit,
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

  const sellAssetIsOnOsmosisNetwork = sellAsset.chainId === osmosisChainId
  const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
  const cosmosFees = await cosmosAdapter.getFeeData(getFeeDataInput)
  const osmoFees = await osmosisAdapter.getFeeData(getFeeDataInput)
  const initiatingTxFeeData = sellAssetIsOnOsmosisNetwork ? osmoFees : cosmosFees

  const osmosisToCosmosProtocolFees = {
    [sellAsset.assetId]: {
      amountCryptoBaseUnit: osmosis.MIN_FEE,
      requiresBalance: true, // network fee for second hop, represented as a protocol fee here

      asset: sellAsset,
    },
    [buyAsset.assetId]: {
      amountCryptoBaseUnit: buyAssetTradeFeeCryptoBaseUnit,
      requiresBalance: false,
      asset: buyAsset,
    },
  }

  const cosmosToOsmosisProtocolFees = {
    [sellAsset.assetId]: {
      amountCryptoBaseUnit: osmoFees.fast.txFee,
      requiresBalance: true, // network fee for second hop, represented as a protocol fee here
      asset: sellAsset,
    },
    [buyAsset.assetId]: {
      amountCryptoBaseUnit: buyAssetTradeFeeCryptoBaseUnit,
      requiresBalance: false,
      asset: buyAsset,
    },
  }

  return Ok({
    minimumCryptoHuman,
    steps: [
      {
        allowanceContract: '',
        buyAsset,
        feeData: {
          networkFeeCryptoBaseUnit: initiatingTxFeeData.fast.txFee,
          protocolFees:
            // Note, the current implementation is a hack where we consider the whole swap as one hop
            // This is only there to make the fees correct in the UI, but this isn't a "protocol fee", it's a network fee for the second hop (the IBC transfer)
            sellAssetIsOnOsmosisNetwork ? osmosisToCosmosProtocolFees : cosmosToOsmosisProtocolFees,
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
