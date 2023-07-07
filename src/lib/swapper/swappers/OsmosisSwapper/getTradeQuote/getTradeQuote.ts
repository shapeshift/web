import type { ChainId } from '@shapeshiftoss/caip'
import { osmosisChainId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput, osmosis } from '@shapeshiftoss/chain-adapters'
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

  if (!osmosisAdapter)
    return Err(
      makeSwapErrorRight({
        message: 'Failed to get Osmosis adapter',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
  const feeData = await osmosisAdapter.getFeeData(getFeeDataInput)
  const fee = feeData.fast.txFee

  return Ok({
    minimumCryptoHuman,
    steps: [
      {
        allowanceContract: '',
        buyAsset,
        feeData: {
          networkFeeCryptoBaseUnit: fee,
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
