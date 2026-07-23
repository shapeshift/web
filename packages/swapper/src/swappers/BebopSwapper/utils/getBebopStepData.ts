import { fromChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { fromHex } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { StepDataArgs, TxBuildData } from '../../../types'
import type { BebopQuoteResponse } from '../types'

type BaseArgs = {
  tx: BebopQuoteResponse['tx']
}

type GetBebopStepDataArgs = StepDataArgs<BaseArgs>

export const getBebopStepData = async ({
  tx,
  sellAsset,
  type,
  input,
  from,
  deps,
}: GetBebopStepDataArgs): Promise<{
  transactionData?: Extract<TxBuildData, { type: 'evm' }>
  networkFeeCryptoBaseUnit: string
}> => {
  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  if (type === 'rate') {
    // Rates price the provider gas limit without a sender
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      gasLimit: bnOrZero(tx.gas).toString(),
    })

    return { networkFeeCryptoBaseUnit }
  }

  const transactionData = {
    type: 'evm' as const,
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: tx.to,
    data: tx.data,
    value: fromHex(tx.value, 'bigint').toString(),
    gasLimit: tx.gas?.toString(),
  }

  const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
    adapter,
    transactionData,
    from,
    supportsEIP1559,
  })

  return { transactionData, networkFeeCryptoBaseUnit }
}
