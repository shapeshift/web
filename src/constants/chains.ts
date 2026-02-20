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
  KnownChainIds.CeloMainnet,
  KnownChainIds.FlowEvmMainnet,
  KnownChainIds.PlumeMainnet,
  KnownChainIds.StoryMainnet,
  KnownChainIds.WorldChainMainnet,
  KnownChainIds.MantleMainnet,
  KnownChainIds.InkMainnet,
  KnownChainIds.LineaMainnet,
  KnownChainIds.SonicMainnet,
  KnownChainIds.UnichainMainnet,
  KnownChainIds.BobMainnet,
  KnownChainIds.ModeMainnet,
  KnownChainIds.MegaEthMainnet,
  KnownChainIds.ZkSyncEraMainnet,
  KnownChainIds.BlastMainnet,
  KnownChainIds.HemiMainnet,
  KnownChainIds.BerachainMainnet,
  KnownChainIds.ScrollMainnet,
  KnownChainIds.CronosMainnet,
  KnownChainIds.SoneiumMainnet,
  KnownChainIds.NearMainnet,
  KnownChainIds.StarknetMainnet,
]

// returns known ChainIds as an array, excluding the ones that are currently flagged off
export const knownChainIds = Object.values(KnownChainIds).filter(chainId => {
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
  if (chainId === KnownChainIds.CeloMainnet && !enabledFlags.Celo) return false
  if (chainId === KnownChainIds.FlowEvmMainnet && !enabledFlags.FlowEvm) return false
  if (chainId === KnownChainIds.StoryMainnet && !enabledFlags.Story) return false
  if (chainId === KnownChainIds.WorldChainMainnet && !enabledFlags.WorldChain) return false
  if (chainId === KnownChainIds.MantleMainnet && !enabledFlags.Mantle) return false
  if (chainId === KnownChainIds.InkMainnet && !enabledFlags.Ink) return false
  if (chainId === KnownChainIds.LineaMainnet && !enabledFlags.Linea) return false
  if (chainId === KnownChainIds.SonicMainnet && !enabledFlags.Sonic) return false
  if (chainId === KnownChainIds.UnichainMainnet && !enabledFlags.Unichain) return false
  if (chainId === KnownChainIds.BobMainnet && !enabledFlags.Bob) return false
  if (chainId === KnownChainIds.ModeMainnet && !enabledFlags.Mode) return false
  if (chainId === KnownChainIds.MegaEthMainnet && !enabledFlags.MegaEth) return false
  if (chainId === KnownChainIds.PlumeMainnet && !enabledFlags.Plume) return false
  if (chainId === KnownChainIds.ZkSyncEraMainnet && !enabledFlags.ZkSyncEra) return false
  if (chainId === KnownChainIds.BlastMainnet && !enabledFlags.Blast) return false
  if (chainId === KnownChainIds.HemiMainnet && !enabledFlags.Hemi) return false
  if (chainId === KnownChainIds.BerachainMainnet && !enabledFlags.Berachain) return false
  if (chainId === KnownChainIds.ScrollMainnet && !enabledFlags.Scroll) return false
  if (chainId === KnownChainIds.CronosMainnet && !enabledFlags.Cronos) return false
  if (chainId === KnownChainIds.SoneiumMainnet && !enabledFlags.Soneium) return false
  if (chainId === KnownChainIds.NearMainnet && !enabledFlags.Near) return false
  if (chainId === KnownChainIds.StarknetMainnet && !enabledFlags.Starknet) return false
  if (chainId === KnownChainIds.TonMainnet && !enabledFlags.Ton) return false
  if (chainId === KnownChainIds.ZcashMainnet && !enabledFlags.Zcash) return false

  return true
})
