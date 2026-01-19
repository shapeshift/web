import { KnownChainIds } from '@shapeshiftoss/types'

import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store } from '@/state/store'

const enabledFlags = preferences.selectors.selectFeatureFlags(store.getState())

export const SECOND_CLASS_CHAINS: readonly KnownChainIds[] = [
  KnownChainIds.TronMainnet,
  KnownChainIds.SuiMainnet,
  KnownChainIds.TonMainnet,
  KnownChainIds.MonadMainnet,
  KnownChainIds.HyperEvmMainnet,
  KnownChainIds.PlasmaMainnet,
  KnownChainIds.KatanaMainnet,
  KnownChainIds.NearMainnet,
  KnownChainIds.StarknetMainnet,
]

// returns known ChainIds as an array, excluding the ones that are currently flagged off
export const knownChainIds = Object.values(KnownChainIds).filter(chainId => {
  if (chainId === KnownChainIds.ArbitrumNovaMainnet && !enabledFlags.ArbitrumNova) return false
  if (chainId === KnownChainIds.ArbitrumMainnet && !enabledFlags.Arbitrum) return false
  if (chainId === KnownChainIds.GnosisMainnet && !enabledFlags.Gnosis) return false
  if (chainId === KnownChainIds.PolygonMainnet && !enabledFlags.Polygon) return false
  if (chainId === KnownChainIds.OptimismMainnet && !enabledFlags.Optimism) return false
  if (chainId === KnownChainIds.BaseMainnet && !enabledFlags.Base) return false
  if (chainId === KnownChainIds.SolanaMainnet && !enabledFlags.Solana) return false
  if (chainId === KnownChainIds.SuiMainnet && !enabledFlags.Sui) return false
  if (chainId === KnownChainIds.MayachainMainnet && !enabledFlags.Mayachain) return false
  if (chainId === KnownChainIds.TronMainnet && !enabledFlags.Tron) return false
  if (chainId === KnownChainIds.MonadMainnet && !enabledFlags.Monad) return false
  if (chainId === KnownChainIds.HyperEvmMainnet && !enabledFlags.HyperEvm) return false
  if (chainId === KnownChainIds.PlasmaMainnet && !enabledFlags.Plasma) return false
  if (chainId === KnownChainIds.KatanaMainnet && !enabledFlags.Katana) return false
  if (chainId === KnownChainIds.NearMainnet && !enabledFlags.Near) return false
  if (chainId === KnownChainIds.StarknetMainnet && !enabledFlags.Starknet) return false
  if (chainId === KnownChainIds.TonMainnet && !enabledFlags.Ton) return false
  if (chainId === KnownChainIds.ZcashMainnet && !enabledFlags.Zcash) return false

  return true
})
