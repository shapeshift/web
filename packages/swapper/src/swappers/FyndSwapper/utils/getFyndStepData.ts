import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import {
  getEvmNetworkFeeCryptoBaseUnit,
  getEvmRateNetworkFeeCryptoBaseUnit,
} from '../../../utils/evm'
import type { FyndEncodedQuote } from '../types'

type BaseArgs = {
  quote: FyndEncodedQuote
  sellAmountCryptoBaseUnit: string
  spenderAddress: string
}

export type GetFyndStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

type FyndRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type FyndQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getFyndStepData(
  args: Extract<GetFyndStepDataArgs, { type: 'rate' }>,
): Promise<Result<FyndRateStepData, SwapErrorRight>>
export function getFyndStepData(
  args: Extract<GetFyndStepDataArgs, { type: 'quote' }>,
): Promise<Result<FyndQuoteStepData, SwapErrorRight>>
export async function getFyndStepData(
  args: GetFyndStepDataArgs,
): Promise<Result<FyndRateStepData | FyndQuoteStepData, SwapErrorRight>> {
  const { quote, sellAsset, sellAmountCryptoBaseUnit, spenderAddress, from, type, input, deps } =
    args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: quote.transaction.to,
    data: quote.transaction.data,
    value: quote.transaction.value,
  }

  const stateOverride = { sellAsset, sellAmountCryptoBaseUnit, spenderAddress }

  if (type === 'rate') {
    const networkFeeCryptoBaseUnit = await getEvmRateNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      providerGasLimit: quote.gas_estimate,
      simulation: { transactionData, from, stateOverride },
    }).catch(() => undefined)

    const stepData: FyndRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from,
      supportsEIP1559,
      stateOverride,
      providerGasLimit: quote.gas_estimate,
    })

    const stepData: FyndQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getFyndStepData', error))
  }
}
