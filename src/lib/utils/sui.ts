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

    const txBlock = await client.getTransactionBlock({
      digest: txHash,
      options: {
        showEffects: true,
      },
    })

    if (!txBlock.effects) return TxStatus.Unknown

    const status = txBlock.effects.status.status
    if (status === 'success') return TxStatus.Confirmed
    if (status === 'failure') return TxStatus.Failed

    return TxStatus.Unknown
  } catch (error) {
    console.error('Error getting SUI transaction status:', error)
    return TxStatus.Unknown
  }
}
