import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import {
  getEvmNetworkFeeCryptoBaseUnit,
  getEvmRateNetworkFeeCryptoBaseUnit,
} from '../../../utils/evm'
import type { CleaveTransaction } from '../types'

type BaseArgs = {
  transaction: CleaveTransaction
  sellAmountCryptoBaseUnit: string
  spenderAddress: string
}

export type GetCleaveStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

type CleaveRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type CleaveQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getCleaveStepData(
  args: Extract<GetCleaveStepDataArgs, { type: 'rate' }>,
): Promise<Result<CleaveRateStepData, SwapErrorRight>>
export function getCleaveStepData(
  args: Extract<GetCleaveStepDataArgs, { type: 'quote' }>,
): Promise<Result<CleaveQuoteStepData, SwapErrorRight>>
export async function getCleaveStepData(
  args: GetCleaveStepDataArgs,
): Promise<Result<CleaveRateStepData | CleaveQuoteStepData, SwapErrorRight>> {
  const {
    transaction,
    sellAsset,
    sellAmountCryptoBaseUnit,
    spenderAddress,
    from,
    type,
    input,
    deps,
  } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
  }

  const stateOverride = { sellAsset, sellAmountCryptoBaseUnit, spenderAddress }

  if (type === 'rate') {
    const networkFeeCryptoBaseUnit = await getEvmRateNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      providerGasLimit: undefined,
      simulation: { transactionData, from, stateOverride },
    }).catch(() => undefined)

    const stepData: CleaveRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from,
      supportsEIP1559,
      stateOverride,
    })

    const stepData: CleaveQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getCleaveStepData', error))
  }
}
