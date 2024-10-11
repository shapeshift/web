import { type ChainId, solanaChainId } from '@shapeshiftoss/caip'
import type { solana } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

export const isSolanaChainAdapter = (
  chainAdapter: unknown,
): chainAdapter is solana.ChainAdapter => {
  return (chainAdapter as solana.ChainAdapter).getChainId() === solanaChainId
}

export const assertGetSolanaChainAdapter = (
  chainId: ChainId | KnownChainIds,
): solana.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isSolanaChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}
