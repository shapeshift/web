import type { ChainId } from '@shapeshiftoss/caip'
import { tonChainId } from '@shapeshiftoss/caip'
import type { ton } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const supportsTon = (wallet: HDWallet): boolean => {
  return '_supportsTon' in wallet && (wallet as any)._supportsTon === true
}

export const isTonChainAdapter = (chainAdapter: unknown): chainAdapter is ton.ChainAdapter => {
  if (!chainAdapter || typeof chainAdapter !== 'object') return false
  return (chainAdapter as ton.ChainAdapter).getChainId() === tonChainId
}

export const assertGetTonChainAdapter = (chainId: ChainId | KnownChainIds): ton.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isTonChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getTonTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  try {
    const adapter = assertGetTonChainAdapter(tonChainId)
    const status = await adapter.getTransactionStatus(txHash)
    return status
  } catch (error) {
    console.error('[TON] Error getting transaction status:', error)
    return TxStatus.Pending
  }
}
