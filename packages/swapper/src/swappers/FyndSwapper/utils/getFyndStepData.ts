import { fromChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { FyndTransaction } from '../types'

export type GetFyndStepDataArgs = StepDataArgs<
  unknown,
  { gasEstimate: string; gasPrice: string | null },
  { transaction: FyndTransaction; from: string }
>

type FyndRateStepData = { networkFeeCryptoBaseUnit: string }
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
  if (args.type === 'rate') {
    if (args.gasPrice === null) {
      return Err(
        makeNetworkFeeEstimationFailedErr(
          'getFyndStepData',
          new Error('Fynd returned a null gas price'),
        ),
      )
    }
    return Ok({
      networkFeeCryptoBaseUnit: bn(args.gasEstimate).times(args.gasPrice).toFixed(),
    })
  }

  const { sellAsset, transaction, from, input, deps } = args
  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
      transactionData,
      from,
      supportsEIP1559: 'supportsEIP1559' in input ? input.supportsEIP1559 : false,
    })
    return Ok({ transactionData, networkFeeCryptoBaseUnit })
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getFyndStepData', error))
  }
}
