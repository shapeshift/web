import type { ChainId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainAdapter, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import { cosmosSdkChainIds } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

export const isCosmosSdkChainAdapter = (
  chainAdapter: unknown,
): chainAdapter is CosmosSdkChainAdapter => {
  return cosmosSdkChainIds.includes(
    (chainAdapter as CosmosSdkChainAdapter).getChainId() as CosmosSdkChainId,
  )
}

export const assertGetCosmosSdkChainAdapter = (
  chainId: ChainId | KnownChainIds,
): CosmosSdkChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isCosmosSdkChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}
