import type { ChainId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { isSome } from 'lib/utils'

export const filterChainIdsBySearchTerm = (search: string, chainIds: ChainId[]) => {
  if (!chainIds.length) return []

  const chainAdapterManager = getChainAdapterManager()

  const chainMetadata = chainIds
    .map(chainId => {
      const adapter = chainAdapterManager.get(chainId)
      if (!adapter) return undefined

      return {
        displayName: adapter.getDisplayName(),
        chainId,
      }
    })
    .filter(isSome)

  return matchSorter(chainMetadata, search, {
    keys: ['displayName'],
    threshold: matchSorter.rankings.CONTAINS,
  }).map(({ chainId }) => chainId)
}
