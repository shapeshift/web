import type { ChainId } from '@shapeshiftoss/caip'
import { nearChainId } from '@shapeshiftoss/caip'
import type { near } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const supportsNear = (wallet: HDWallet): boolean => {
  return '_supportsNear' in wallet && (wallet as any)._supportsNear === true
}

export const isNearChainAdapter = (chainAdapter: unknown): chainAdapter is near.ChainAdapter => {
  if (!chainAdapter || typeof chainAdapter !== 'object') return false
  return (chainAdapter as near.ChainAdapter).getChainId() === nearChainId
}

export const assertGetNearChainAdapter = (chainId: ChainId | KnownChainIds): near.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isNearChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getNearTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  try {
    const adapter = assertGetNearChainAdapter(nearChainId)
    return await adapter.getTransactionStatus(txHash)
  } catch (error) {
    console.error('Error getting NEAR transaction status:', error)
    return TxStatus.Unknown
  }
}
