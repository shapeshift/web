import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import type { CowSwapTradeRateInput } from '../types'
import { getCowSwapStepData } from '../utils/getCowSwapStepData'
import { getCowSwapTradeContext } from '../utils/getCowSwapTradeContext'

export const getCowSwapTradeRate = async (
  input: CowSwapTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { receiveAddress } = input

  const maybeContext = await getCowSwapTradeContext({
    input,
    deps,
    // The signer is only known at execution - the CoW quote is simulated from the zero address
    senderAddress: zeroAddress,
    receiveAddress,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = getCowSwapStepData({ ...stepDataArgs, type: 'rate', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate' as const,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber: undefined,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeRate])
}
