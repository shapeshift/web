import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import {
  getEvmNetworkFeeCryptoBaseUnit,
  getEvmRateNetworkFeeCryptoBaseUnit,
} from '../../../utils/evm'
import type { AcrossTransactionAction } from './types'

type BaseArgs = {
  transactionAction: AcrossTransactionAction
  sellAmountCryptoBaseUnit: string
  spenderAddress: string
  providerGasLimit: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string
}

export type GetAcrossStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

type AcrossRateStepData = { networkFeeCryptoBaseUnit: string }
type AcrossQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getAcrossStepData(
  args: Extract<GetAcrossStepDataArgs, { type: 'rate' }>,
): Promise<Result<AcrossRateStepData, SwapErrorRight>>
export function getAcrossStepData(
  args: Extract<GetAcrossStepDataArgs, { type: 'quote' }>,
): Promise<Result<AcrossQuoteStepData, SwapErrorRight>>
export async function getAcrossStepData(
  args: GetAcrossStepDataArgs,
): Promise<Result<AcrossRateStepData | AcrossQuoteStepData, SwapErrorRight>> {
  const {
    transactionAction,
    sellAsset,
    sellAmountCryptoBaseUnit,
    spenderAddress,
    providerGasLimit,
    from,
    type,
    input,
    fallbackNetworkFeeCryptoBaseUnit,
    deps,
  } = args

  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)

  const transactionData = {
    type: 'evm' as const,
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: transactionAction.to,
    data: transactionAction.data,
    value: transactionAction.value,
  }

  const stateOverride = { sellAsset, sellAmountCryptoBaseUnit, spenderAddress }

  if (type === 'rate') {
    const networkFeeCryptoBaseUnit = await getEvmRateNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      providerGasLimit,
      simulation: { transactionData, from, stateOverride },
    }).catch(() => fallbackNetworkFeeCryptoBaseUnit)

    return Ok({ networkFeeCryptoBaseUnit })
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from,
      supportsEIP1559,
      stateOverride,
      providerGasLimit,
    })

    return Ok({ transactionData, networkFeeCryptoBaseUnit })
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getAcrossStepData', error))
  }
}
