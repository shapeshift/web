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

type FyndRateStepData = { networkFeeCryptoBaseUnit: string }
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
  try {
    const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
    const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false
    if (args.type === 'rate') {
      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter,
        supportsEIP1559,
        gasLimit: args.gasEstimate,
      })
      return Ok({ networkFeeCryptoBaseUnit })
    }
    const transactionData: TxBuildData = {
      type: 'evm',
      chainId: Number(fromChainId(sellAsset.chainId).chainReference),
      to: args.transaction.to,
      data: args.transaction.data,
      value: args.transaction.value,
    }
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
    return Ok({ transactionData, networkFeeCryptoBaseUnit })
  } catch (error) {
    if (args.type === 'rate' && args.gasPrice !== null) {
      return Ok({
        networkFeeCryptoBaseUnit: bn(args.gasEstimate).times(args.gasPrice).toFixed(),
      })
    }
    return Err(makeNetworkFeeEstimationFailedErr('getFyndStepData', error))
  }
}
