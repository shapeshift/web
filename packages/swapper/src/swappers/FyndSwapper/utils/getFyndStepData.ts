import { fromChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { FyndTransaction } from '../types'

type GetFyndStepDataArgs = StepDataArgs<
  {
    transaction: FyndTransaction
    spenderAddress: string
    sellAmountCryptoBaseUnit: string
    from: string
  },
  { gasEstimate: string; gasPrice: string | null }
>

type FyndRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type FyndQuoteStepData = {
  transactionData: TxBuildData
  networkFeeCryptoBaseUnit: string
}

export function getFyndStepData(
  args: Extract<GetFyndStepDataArgs, { type: 'rate' }>,
): Promise<Result<FyndRateStepData, SwapErrorRight>>
export function getFyndStepData(
  args: Extract<GetFyndStepDataArgs, { type: 'quote' }>,
): Promise<Result<FyndQuoteStepData, SwapErrorRight>>
export async function getFyndStepData(
  args: GetFyndStepDataArgs,
): Promise<Result<FyndRateStepData | FyndQuoteStepData, SwapErrorRight>> {
  const { sellAsset, input, deps } = args
  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: args.transaction.to,
    data: args.transaction.data,
    value: args.transaction.value,
  }
  const stateOverride = {
    sellAsset,
    sellAmountCryptoBaseUnit: args.sellAmountCryptoBaseUnit,
    spenderAddress: args.spenderAddress,
  }

  if (args.type === 'rate') {
    const networkFeeCryptoBaseUnit = await (async () => {
      try {
        return await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from: args.from,
          supportsEIP1559,
          stateOverride,
        })
      } catch {
        return args.gasPrice ? bn(args.gasEstimate).times(args.gasPrice).toFixed(0) : undefined
      }
    })()

    const stepData: FyndRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  // Estimation also has the router verify the signed fee before the user signs
  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from: args.from,
      supportsEIP1559,
      stateOverride,
    })

    const stepData: FyndQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getFyndStepData', error))
  }
}
