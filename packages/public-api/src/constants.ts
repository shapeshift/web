import { SwapperName } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'

export const SUPPORTED_CHAIN_IDS: readonly KnownChainIds[] = [
  // EVM
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.EthereumMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.PolygonMainnet,
  // UTXO
  KnownChainIds.BitcoinCashMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.LitecoinMainnet,
  // Cosmos SDK
  KnownChainIds.CosmosMainnet,
  KnownChainIds.MayachainMainnet,
  KnownChainIds.ThorchainMainnet,
  // Solana
  KnownChainIds.SolanaMainnet,
]

export const SUPPORTED_CHAIN_IDS_SET: ReadonlySet<string> = new Set(SUPPORTED_CHAIN_IDS)

export const ENABLED_SWAPPER_NAMES: readonly SwapperName[] = [
  SwapperName.Bebop,
  SwapperName.ButterSwap,
  SwapperName.Chainflip,
  SwapperName.CowSwap,
  SwapperName.Mayachain,
  SwapperName.NearIntents,
  SwapperName.Portals,
  SwapperName.Relay,
  SwapperName.Thorchain,
  SwapperName.Zrx,
]
