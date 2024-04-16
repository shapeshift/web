import { arbitrumNovaChainId, gnosisChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { selectFeatureFlag } from 'state/slices/selectors'
import { store } from 'state/store'
// returns known ChainIds as an array, excludingg the ones that are currently flagged off
export const knownChainIds = Object.values(KnownChainIds).filter(chainId => {
  const isArbitrumEnabled = selectFeatureFlag(store.getState(), 'Arbitrum')
  const isArbitrumNovaEnabled = selectFeatureFlag(store.getState(), 'ArbitrumNova')
  const isGnosisEnabled = selectFeatureFlag(store.getState(), 'Gnosis')
  const isPolygonEnabled = selectFeatureFlag(store.getState(), 'Polygon')
  const isOptimismEnabled = selectFeatureFlag(store.getState(), 'Optimism')
  if (chainId === arbitrumNovaChainId && !isArbitrumNovaEnabled) return false
  if (chainId === KnownChainIds.ArbitrumMainnet && !isArbitrumEnabled) return false
  if (chainId === gnosisChainId && !isGnosisEnabled) return false
  if (chainId === KnownChainIds.PolygonMainnet && !isPolygonEnabled) return false
  if (chainId === KnownChainIds.OptimismMainnet && !isOptimismEnabled) return false

  return true
})
