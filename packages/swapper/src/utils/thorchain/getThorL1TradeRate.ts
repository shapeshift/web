import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, SwapperName } from '../../types'
import { getSuccessfulTrades, getThorL1TradeContexts } from './getThorL1TradeContexts'
import { getThorStepData } from './getThorStepData'
import type { ThorTradeRate, ThorTradeRateInput, TradeType } from './types'

export const getThorL1TradeRate = async (
  input: ThorTradeRateInput,
  deps: SwapperDeps,
  streamingInterval: number,
  tradeType: TradeType,
  swapperName: SwapperName,
): Promise<Result<ThorTradeRate[], SwapErrorRight>> => {
  const { receiveAddress } = input

  const maybeContexts = await getThorL1TradeContexts(
    input,
    deps,
    streamingInterval,
    tradeType,
    swapperName,
  )

  if (maybeContexts.isErr()) return Err(maybeContexts.unwrapErr())
  const routes = maybeContexts.unwrap()

  const maybeRates = await Promise.allSettled(
    routes.map(
      async ({
        tradeCommon,
        stepCommon,
        protocolFees,
        stepDataArgs,
      }): Promise<Result<ThorTradeRate, SwapErrorRight>> => {
        // Rates carry no processed memo; step data sizes utxo/solana estimation with the raw thornode memo
        const maybeStepData = await getThorStepData({
          ...stepDataArgs,
          type: 'rate',
          input,
          memo: '',
        })

        if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
        const { networkFeeCryptoBaseUnit, data, router } = maybeStepData.unwrap()

        const rate: ThorTradeRate = {
          ...tradeCommon,
          quoteOrRate: 'rate',
          memo: '',
          receiveAddress,
          data,
          steps: [
            {
              ...stepCommon,
              accountNumber: undefined,
              allowanceContract: router ?? '',
              feeData: { networkFeeCryptoBaseUnit, protocolFees },
            },
          ],
        }

        return Ok(rate)
      },
    ),
  )

  return getSuccessfulTrades(maybeRates)
}
