import { fromChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { fromHex } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import type { BebopQuoteResponse } from '../types'

type BaseArgs = {
  tx: BebopQuoteResponse['tx']
}

export type GetBebopStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

type BebopRateStepData = { networkFeeCryptoBaseUnit: string }
type BebopQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getBebopStepData(
  args: Extract<GetBebopStepDataArgs, { type: 'rate' }>,
): Promise<Result<BebopRateStepData, SwapErrorRight>>
export function getBebopStepData(
  args: Extract<GetBebopStepDataArgs, { type: 'quote' }>,
): Promise<Result<BebopQuoteStepData, SwapErrorRight>>
export async function getBebopStepData(
  args: GetBebopStepDataArgs,
): Promise<Result<BebopRateStepData | BebopQuoteStepData, SwapErrorRight>> {
  const { tx, sellAsset, type, input, from, deps } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  if (type === 'rate') {
    const networkFeeCryptoBaseUnit = await (async () => {
      try {
        return await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          supportsEIP1559,
          gasLimit: bnOrZero(tx.gas).toString(),
        })
      } catch {
        return bnOrZero(tx.gas).times(bnOrZero(tx.gasPrice)).toFixed(0)
      }
    })()

    const stepData: BebopRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  const transactionData = {
    type: 'evm' as const,
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: tx.to,
    data: tx.data,
    value: fromHex(tx.value, 'bigint').toString(),
    gasLimit: tx.gas?.toString(),
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from,
      supportsEIP1559,
    })

    const stepData: BebopQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getBebopStepData', error))
  }
}
