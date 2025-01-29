import type { ChainId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainAdapter, thorchain } from '@shapeshiftoss/chain-adapters'
import { cosmosSdkChainIds } from '@shapeshiftoss/chain-adapters'
import type { CosmosSdkChainId } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
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

export const assertGetThorchainChainAdapter = (): thorchain.ChainAdapter => {
  return assertGetCosmosSdkChainAdapter(KnownChainIds.ThorchainMainnet) as thorchain.ChainAdapter
}
