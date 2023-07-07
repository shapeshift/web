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

  // TODO(gomes): assertion util
  if (!osmosisAdapter || !cosmosAdapter)
    return Err(
      makeSwapErrorRight({
        message: 'Failed to get Cosmos SDK adapters',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  // First hop fees are always paid in the native asset of the sell asset
  // i.e ATOM for ATOM -> OSMO, OSMO for OSMO -> ATOM
  const firstHopAdapter = sellAsset.chainId === osmosisChainId ? osmosisAdapter : cosmosAdapter
  const getFirstHopFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
  const firstHopFeeData = await firstHopAdapter.getFeeData(getFirstHopFeeDataInput)
  const firstHopFee = firstHopFeeData.fast.txFee

  // Second hop always happens on Osmosis, so the fee is always paid in OSMO. i.e:
  // 1. in OSMO for OSMO -> ATOM, since both the swap-exact-amount-in to ATOM on Osmosis, and the IBC transfer to Cosmos IBC channel are paid in OSMO
  // 2. in OSMO for ATOM -> OSMO, since the IBC transfer is paid in ATOM, but the second IBC transfer hop is paid in OSMO
  const secondHopAdapter = osmosisAdapter
  const getSecondHopFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
  const secondHopFeeData = await secondHopAdapter.getFeeData(getSecondHopFeeDataInput)
  const secondHopFee = secondHopFeeData.fast.txFee

  return Ok({
    minimumCryptoHuman,
    steps: [
      {
        allowanceContract: '',
        buyAsset,
        feeData: {
          networkFeeCryptoBaseUnit: firstHopFee,
          protocolFees: {
            [buyAsset.assetId]: {
              amountCryptoBaseUnit: buyAssetTradeFeeCryptoBaseUnit,
              requiresBalance: true,
              asset: buyAsset,
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
