import { TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET } from '@shapeshiftoss/contracts'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  MultiHopTradeRateSteps,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
} from '../../../types'
import type { ThorTradeRate, ThorTradeRateInput } from '../../../utils/thorchain'
import { getSuccessfulTrades, getThorL1TradeRate, TradeType } from '../../../utils/thorchain'
import { assertValidL1ToLongtailTrade } from './assertValidLongtailTrade'
import { getBestAggregator } from './getBestAggregator'
import { getTokenFromAsset, getWrappedToken } from './longTailHelpers'

export const getL1ToLongtailRate = async (
  input: ThorTradeRateInput,
  deps: SwapperDeps,
  streamingInterval: number,
  swapperName: SwapperName,
): Promise<Result<ThorTradeRate[], SwapErrorRight>> => {
  const {
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    sellAsset,
  } = input

  const assertion = await assertValidL1ToLongtailTrade({ sellAsset, buyAsset, deps })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { buyAssetFeeAsset } = assertion.unwrap()

  const l1Tol1RateInput: ThorTradeRateInput = {
    ...input,
    buyAsset: buyAssetFeeAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
  }

  const maybeL1Rates = await getThorL1TradeRate(
    l1Tol1RateInput,
    deps,
    streamingInterval,
    TradeType.L1ToLongTail,
    swapperName,
  )

  if (maybeL1Rates.isErr()) return Err(maybeL1Rates.unwrapErr())

  const maybeRates = await Promise.allSettled(
    maybeL1Rates.unwrap().map(async (quote): Promise<Result<ThorTradeRate, SwapErrorRight>> => {
      const [step] = quote.steps

      const maybeBestAggregator = await getBestAggregator(
        buyAssetFeeAsset,
        getWrappedToken(buyAssetFeeAsset),
        getTokenFromAsset(buyAsset),
        step.buyAmountAfterFeesCryptoBaseUnit,
      )

      if (maybeBestAggregator.isErr()) return Err(maybeBestAggregator.unwrapErr())
      const { quotedAmountOut } = maybeBestAggregator.unwrap()

      return Ok({
        ...quote,
        // No memo is returned upstream for rates
        memo: '',
        steps: quote.steps.map(s => ({
          ...s,
          buyAsset,
          buyAmountAfterFeesCryptoBaseUnit: quotedAmountOut.toString(),
          // This is wrong, we should get the get the value before fees or display ETH value received after the thorchain bridge
          buyAmountBeforeFeesCryptoBaseUnit: quotedAmountOut.toString(),
          allowanceContract: TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
        })) as MultiHopTradeRateSteps,
        isLongtail: true,
      })
    }),
  )

  return getSuccessfulTrades(maybeRates)
}
