import type { ChainId } from '@shapeshiftoss/caip'
import type { UtxoChainAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { utxoChainIds } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

export const isUtxoChainAdapter = (chainAdapter: unknown): chainAdapter is UtxoChainAdapter => {
  return utxoChainIds.includes((chainAdapter as UtxoChainAdapter).getChainId() as UtxoChainId)
}

export const assertGetUtxoChainAdapter = (chainId: ChainId | KnownChainIds): UtxoChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isUtxoChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}
