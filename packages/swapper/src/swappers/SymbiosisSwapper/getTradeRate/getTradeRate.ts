import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { getSymbiosisStepData } from '../utils/getSymbiosisStepData'
import { getSymbiosisTradeContext } from '../utils/getSymbiosisTradeContext'
import { getDefaultUserAddress } from '../utils/helpers'
import type { SymbiosisTradeRateInput } from '../utils/types'

export const getTradeRate = async (
  input: SymbiosisTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, sellAsset, buyAsset, sendAddress, receiveAddress } = input

  const from = sendAddress ?? getDefaultUserAddress(sellAsset.chainId)
  const to = receiveAddress ?? getDefaultUserAddress(buyAsset.chainId)

  const maybeContext = await getSymbiosisTradeContext({ input, deps, from, to })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getSymbiosisStepData({ ...stepDataArgs, type: 'rate', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate' as const,
    receiveAddress: to,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeRate])
}
