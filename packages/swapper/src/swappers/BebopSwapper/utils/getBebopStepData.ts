import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { fromHex } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { TxBuildData } from '../../../types'
import type { BebopQuoteResponse } from '../types'

type BebopStepData = {
  transactionData: Extract<TxBuildData, { type: 'evm' }>
  networkFeeCryptoBaseUnit: string
}

export const getBebopStepData = async ({
  tx,
  sellAsset,
  from,
  supportsEIP1559,
  adapter,
}: {
  tx: BebopQuoteResponse['tx']
  sellAsset: Asset
  from: string
  supportsEIP1559: boolean
  adapter: EvmChainAdapter
}): Promise<BebopStepData> => {
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
