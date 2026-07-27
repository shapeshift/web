import { TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET } from '@shapeshiftoss/contracts'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type {
  MultiHopTradeRateSteps,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
} from '../../../types'
import type { ThorTradeRate, ThorTradeRateInput } from '../../../utils/thorchain'
import { getThorL1TradeRate, TradeType } from '../../../utils/thorchain'
import { assertValidLongtailToL1Trade } from './assertValidLongtailTrade'
import { getBestAggregator } from './getBestAggregator'
import { getTokenFromAsset, getWrappedToken } from './longTailHelpers'

// This just uses UniswapV3 to get the longtail quote for now.
export const getLongtailToL1Rate = async (
  input: ThorTradeRateInput,
  deps: SwapperDeps,
  streamingInterval: number,
  swapperName: SwapperName,
): Promise<Result<ThorTradeRate[], SwapErrorRight>> => {
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  const assertion = assertValidLongtailToL1Trade({ sellAsset, deps })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { buyAssetFeeAsset } = assertion.unwrap()

  const maybeBestAggregator = await getBestAggregator(
    buyAssetFeeAsset,
    getTokenFromAsset(sellAsset),
    getWrappedToken(buyAssetFeeAsset),
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )

  if (maybeBestAggregator.isErr()) {
    return Err(maybeBestAggregator.unwrapErr())
  }

  const { quotedAmountOut } = maybeBestAggregator.unwrap()

  const l1Tol1QuoteInput: ThorTradeRateInput = {
    ...input,
    sellAsset: buyAssetFeeAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: quotedAmountOut.toString(),
  }

  const maybeL1Rates = await getThorL1TradeRate(
    l1Tol1QuoteInput,
    deps,
    streamingInterval,
    TradeType.LongTailToL1,
    swapperName,
  )

  return maybeL1Rates.map(rates =>
    rates.map(rate => ({
      ...rate,
      // This logic will need to be updated to support multi-hop, if that's ever implemented for THORChain
      steps: rate.steps.map(s => ({
        ...s,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        sellAsset,
        allowanceContract: TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
      })) as MultiHopTradeRateSteps,
      isLongtail: true,
    })),
  )
}
