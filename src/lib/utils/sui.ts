import type { ChainId } from '@shapeshiftoss/caip'
import { suiChainId } from '@shapeshiftoss/caip'
import type { sui } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isSuiChainAdapter = (chainAdapter: unknown): chainAdapter is sui.ChainAdapter => {
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
