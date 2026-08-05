import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, SwapperName } from '../../types'
import { assertQuoteAddresses, makeTradeStepBuildFailedErr } from '../../utils'
import { normalizeEpochToMs } from '../helpers'
import { getLimitWithManualSlippage } from './getLimitWithManualSlippage/getLimitWithManualSlippage'
import { getSuccessfulTrades, getThorL1TradeContexts } from './getThorL1TradeContexts'
import { getThorStepData } from './getThorStepData'
import { addLimitToMemo, assertAndProcessMemo, getAffiliate } from './index'
import type { ThorTradeQuote, ThorTradeQuoteInput, ThorTradeRoute, TradeType } from './types'

const getThorQuoteMemo = (
  route: ThorTradeRoute,
  swapperName: SwapperName,
): Result<string, SwapErrorRight> => {
  if (!route.quote.memo) return Err(makeTradeStepBuildFailedErr('getThorL1TradeQuote'))

  // always use auto stream quote memo (0 limit = 5bps - 50bps, sometimes up to 100bps)
  // see: https://discord.com/channels/838986635756044328/1166265575941619742/1166500062101250100
  if (route.isStreaming) {
    return Ok(assertAndProcessMemo(route.quote.memo, getAffiliate(swapperName)))
  }

  const limitWithManualSlippage = getLimitWithManualSlippage({
    expectedAmountOutThorBaseUnit: route.expectedAmountOutThorBaseUnit,
    slippageBps: route.slippageBps,
  })

  return Ok(
    addLimitToMemo({
      memo: route.quote.memo,
      limit: limitWithManualSlippage,
      affilate: getAffiliate(swapperName),
    }),
  )
}

export const getThorL1TradeQuote = async (
  input: ThorTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
  tradeType: TradeType,
  swapperName: SwapperName,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  const addresses = assertQuoteAddresses(input)
  if (addresses.isErr()) return Err(addresses.unwrapErr())
  const { sendAddress, receiveAddress } = addresses.unwrap()

  const maybeContexts = await getThorL1TradeContexts(
    input,
    deps,
    streamingInterval,
    tradeType,
    swapperName,
  )

  if (maybeContexts.isErr()) return Err(maybeContexts.unwrapErr())
  const routes = maybeContexts.unwrap()

  const maybeQuotes = await Promise.allSettled(
    routes.map(
      async ({
        route,
        tradeCommon,
        stepCommon,
        protocolFees,
        stepDataArgs,
      }): Promise<Result<ThorTradeQuote, SwapErrorRight>> => {
        const memoResult = getThorQuoteMemo(route, swapperName)
        if (memoResult.isErr()) return Err(memoResult.unwrapErr())
        const memo = memoResult.unwrap()

        const maybeStepDate = await getThorStepData({
          ...stepDataArgs,
          type: 'quote',
          input,
          from: sendAddress,
          memo,
        })

        if (maybeStepDate.isErr()) return Err(maybeStepDate.unwrapErr())
        const { networkFeeCryptoBaseUnit, transactionData, data, router } = maybeStepDate.unwrap()

        const quote: ThorTradeQuote = {
          ...tradeCommon,
          quoteOrRate: 'quote',
          // The daemon quote expiry scopes the inbound address - sending funds after it risks a
          // rotated vault
          deadline: normalizeEpochToMs(tradeCommon.expiry),
          memo,
          receiveAddress,
          data,
          steps: [
            {
              ...stepCommon,
              accountNumber,
              allowanceContract: router ?? '',
              transactionData,
              feeData: { networkFeeCryptoBaseUnit, protocolFees },
            },
          ],
        }

        return Ok(quote)
      },
    ),
  )

  return getSuccessfulTrades(maybeQuotes)
}
