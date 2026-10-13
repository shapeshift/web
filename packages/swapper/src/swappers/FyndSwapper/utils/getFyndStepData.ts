import { fromChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { FyndTransaction } from '../types'

type GetFyndStepDataArgs = StepDataArgs<
  unknown,
  { gasEstimate: string; gasPrice: string | null },
  {
    transaction: FyndTransaction
    spenderAddress: string
    sellAmountCryptoBaseUnit: string
  }
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

  if (args.type === 'rate') {
    const networkFeeCryptoBaseUnit = await (async () => {
      try {
        return await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          supportsEIP1559,
          gasLimit: args.gasEstimate,
        })
      } catch {
        return args.gasPrice ? bn(args.gasEstimate).times(args.gasPrice).toFixed(0) : undefined
      }
    })()

    const stepData: FyndRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  // Fynd's gas_estimate is a route-level sum, not a simulation, so estimate on chain and let the
  // router verify the signed fee before the user signs
  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: args.transaction.to,
    data: args.transaction.data,
    value: args.transaction.value,
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from: args.from,
      supportsEIP1559,
      stateOverride: {
        sellAsset,
        sellAmountCryptoBaseUnit: args.sellAmountCryptoBaseUnit,
        spenderAddress: args.spenderAddress,
      },
    })

    const stepData: FyndQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getFyndStepData', error))
  }
}
