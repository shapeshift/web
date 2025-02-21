import type { AccountId, ChainId } from '@shapeshiftmonorepo/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftmonorepo/caip'
import type { UtxoChainAdapter } from '@shapeshiftmonorepo/chain-adapters'
import { utxoChainIds } from '@shapeshiftmonorepo/chain-adapters'
import type { KnownChainIds, UtxoChainId } from '@shapeshiftmonorepo/types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

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

export const isUtxoAccountId = (accountId: AccountId): boolean =>
  fromAccountId(accountId).chainNamespace === CHAIN_NAMESPACE.Utxo

export const isUtxoChainId = (chainId: ChainId): boolean =>
  fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Utxo
