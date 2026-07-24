import { fromChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { fromHex } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import type { BebopQuoteResponse } from '../types'

type BaseArgs = {
  tx: BebopQuoteResponse['tx']
}

export type GetBebopStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

export const getBebopStepData = async ({
  tx,
  sellAsset,
  type,
  input,
  from,
  deps,
}: GetBebopStepDataArgs): Promise<
  Result<
    {
      transactionData?: Extract<TxBuildData, { type: 'evm' }>
      networkFeeCryptoBaseUnit: string
    },
    SwapErrorRight
  >
> => {
  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  if (type === 'rate') {
    try {
      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter,
        supportsEIP1559,
        gasLimit: bnOrZero(tx.gas).toString(),
      })
      return Ok({ networkFeeCryptoBaseUnit })
    } catch {
      return Ok({
        networkFeeCryptoBaseUnit: bnOrZero(tx.gas).times(bnOrZero(tx.gasPrice)).toFixed(0),
      })
    }
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
    return Ok({ transactionData, networkFeeCryptoBaseUnit })
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getBebopStepData', error))
  }
}
