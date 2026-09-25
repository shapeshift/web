import type { ChainId } from '@shapeshiftoss/caip'
import { tronChainId } from '@shapeshiftoss/caip'
import type { tron } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isTronChainAdapter = (chainAdapter: unknown): chainAdapter is tron.ChainAdapter => {
  if (!chainAdapter) return false

  const maybeAdapter = chainAdapter as tron.ChainAdapter
  if (typeof maybeAdapter.getChainId !== 'function') return false

  return maybeAdapter.getChainId() === tronChainId
}

export const assertGetTronChainAdapter = (chainId: ChainId | KnownChainIds): tron.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isTronChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}
