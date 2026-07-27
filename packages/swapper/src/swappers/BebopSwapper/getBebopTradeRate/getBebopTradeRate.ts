import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getAddress } from 'viem'

import type { GetEvmTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { BEBOP_DUMMY_ADDRESS } from '../types'
import { getBebopStepData } from '../utils/getBebopStepData'
import { getBebopTradeContext } from '../utils/getBebopTradeContext'

export const getBebopTradeRate = async (
  input: GetEvmTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, receiveAddress } = input

  const address = getAddress(receiveAddress ?? BEBOP_DUMMY_ADDRESS)

  const maybeContext = await getBebopTradeContext({
    input,
    deps,
    from: address,
    receiver: address,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getBebopStepData({ ...stepDataArgs, type: 'rate', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate',
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { protocolFees: {}, networkFeeCryptoBaseUnit },
      },
    ],
  }

  return Ok([tradeRate])
}
