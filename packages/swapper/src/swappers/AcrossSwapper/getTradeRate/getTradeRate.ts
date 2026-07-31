import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { getAcrossStepData } from '../utils/getAcrossStepData'
import { getAcrossTradeContext } from '../utils/getAcrossTradeContext'
import { getDefaultUserAddress } from '../utils/helpers'
import type { AcrossTradeRateInput } from '../utils/types'

export const getTradeRate = async (
  input: AcrossTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, sellAsset, buyAsset, sendAddress, receiveAddress } = input

  const depositor = sendAddress ?? getDefaultUserAddress(sellAsset.chainId)
  const recipient = receiveAddress ?? getDefaultUserAddress(buyAsset.chainId)

  const maybeContext = await getAcrossTradeContext({ input, deps, depositor, recipient })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getAcrossStepData({ ...stepDataArgs, type: 'rate', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate' as const,
    receiveAddress: recipient,
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
