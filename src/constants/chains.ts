import { KnownChainIds } from '@shapeshiftoss/types'

import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store } from '@/state/store'

const enabledFlags = preferences.selectors.selectFeatureFlags(store.getState())

// returns known ChainIds as an array, excluding the ones that are currently flagged off
export const knownChainIds = Object.values(KnownChainIds).filter(chainId => {
  if (chainId === KnownChainIds.ArbitrumNovaMainnet && !enabledFlags.ArbitrumNova) return false
  if (chainId === KnownChainIds.ArbitrumMainnet && !enabledFlags.Arbitrum) return false
  if (chainId === KnownChainIds.GnosisMainnet && !enabledFlags.Gnosis) return false
  if (chainId === KnownChainIds.PolygonMainnet && !enabledFlags.Polygon) return false
  if (chainId === KnownChainIds.OptimismMainnet && !enabledFlags.Optimism) return false
  if (chainId === KnownChainIds.BaseMainnet && !enabledFlags.Base) return false
  if (chainId === KnownChainIds.SolanaMainnet && !enabledFlags.Solana) return false
  if (chainId === KnownChainIds.MayachainMainnet && !enabledFlags.Mayachain) return false

  return true
})
