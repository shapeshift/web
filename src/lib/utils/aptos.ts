import type { ChainId } from '@shapeshiftoss/caip'
import { aptosChainId } from '@shapeshiftoss/caip'
import type { aptos } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from 'packages/unchained-client/src/types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isAptosChainAdapter = (chainAdapter: unknown): chainAdapter is aptos.ChainAdapter => {
  if (!chainAdapter || typeof chainAdapter !== 'object') return false
  const candidate = chainAdapter as { getChainId?: unknown }
  if (typeof candidate.getChainId !== 'function') return false
  try {
    return (chainAdapter as aptos.ChainAdapter).getChainId() === aptosChainId
  } catch {
    return false
  }
}

export const assertGetAptosChainAdapter = (
  chainId: ChainId | KnownChainIds,
): aptos.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isAptosChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getAptosTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  try {
    const adapter = assertGetAptosChainAdapter(aptosChainId)
    const rpcUrl = adapter.getRpcUrl()

    const response = await fetch(`${rpcUrl}/transactions/by_hash/${txHash}`)
    if (!response.ok) return TxStatus.Unknown

    const tx = await response.json()

    if (tx.success === false) return TxStatus.Failed
    if (tx.success === true) return TxStatus.Confirmed

    return TxStatus.Unknown
  } catch (error) {
    console.error('Error getting Aptos transaction status:', error)
    return TxStatus.Unknown
  }
}
