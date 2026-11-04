import type { ChainId } from '@shapeshiftoss/caip'
import { suiChainId } from '@shapeshiftoss/caip'
import type { sui } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from 'packages/unchained-client/src/types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isSuiChainAdapter = (chainAdapter: unknown): chainAdapter is sui.ChainAdapter => {
  if (!chainAdapter || typeof chainAdapter !== 'object') return false
  return (chainAdapter as sui.ChainAdapter).getChainId() === suiChainId
}

export const assertGetSuiChainAdapter = (chainId: ChainId | KnownChainIds): sui.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isSuiChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getSuiTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  try {
    const adapter = assertGetSuiChainAdapter(suiChainId)
    const client = adapter.getSuiClient()

    const { Transaction } = await client.getTransaction({ digest: txHash })

    return Transaction ? TxStatus.Confirmed : TxStatus.Failed
  } catch (error) {
    console.error('Error getting SUI transaction status:', error)
    return TxStatus.Unknown
  }
}
