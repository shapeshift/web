import type { ChainId } from '@shapeshiftmonorepo/caip'
import type { CosmosSdkChainAdapter, thorchain } from '@shapeshiftmonorepo/chain-adapters'
import { cosmosSdkChainIds } from '@shapeshiftmonorepo/chain-adapters'
import type { CosmosSdkChainId } from '@shapeshiftmonorepo/types'
import { KnownChainIds } from '@shapeshiftmonorepo/types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

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

export const assertGetThorchainChainAdapter = (): thorchain.ChainAdapter => {
  return assertGetCosmosSdkChainAdapter(KnownChainIds.ThorchainMainnet) as thorchain.ChainAdapter
}
