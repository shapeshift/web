import {
  type AccountId,
  CHAIN_NAMESPACE,
  type ChainId,
  fromAccountId,
  fromChainId,
} from '@shapeshiftoss/caip'
import type { UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import { utxoChainIds } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds, UtxoChainId } from '@shapeshiftoss/types'
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

export const isUtxoAccountId = (accountId: AccountId): boolean =>
  fromAccountId(accountId).chainNamespace === CHAIN_NAMESPACE.Utxo

export const isUtxoChainId = (chainId: ChainId): boolean =>
  fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Utxo
