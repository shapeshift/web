import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { DebridgeTx } from './types'

type BaseArgs = {
  tx: DebridgeTx
  gasLimit: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string | undefined
}

// Walletless rates estimate from the default sender, so from is always present
export type GetDebridgeStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

type DebridgeRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type DebridgeQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getDebridgeStepData(
  args: Extract<GetDebridgeStepDataArgs, { type: 'rate' }>,
): Promise<Result<DebridgeRateStepData, SwapErrorRight>>
export function getDebridgeStepData(
  args: Extract<GetDebridgeStepDataArgs, { type: 'quote' }>,
): Promise<Result<DebridgeQuoteStepData, SwapErrorRight>>
export async function getDebridgeStepData(
  args: GetDebridgeStepDataArgs,
): Promise<Result<DebridgeRateStepData | DebridgeQuoteStepData, SwapErrorRight>> {
  const { tx, gasLimit, fallbackNetworkFeeCryptoBaseUnit, sellAsset, from, type, input, deps } =
    args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: tx.to,
    data: tx.data,
    value: tx.value,
    gasLimit,
  }

  if (type === 'rate') {
    const networkFeeCryptoBaseUnit = await (async () => {
      try {
        return await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from,
          supportsEIP1559,
          gasLimitBuffer: 1.2,
        })
      } catch {
        return fallbackNetworkFeeCryptoBaseUnit
      }
    })()

    const stepData: DebridgeRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from,
      supportsEIP1559,
      gasLimitBuffer: 1.2,
    })

    const stepData: DebridgeQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getDebridgeStepData', error))
  }
}
