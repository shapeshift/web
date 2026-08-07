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
  KnownChainIds.HyperEvmMainnet,
  KnownChainIds.KatanaMainnet,
  KnownChainIds.MegaEthMainnet,
  KnownChainIds.MonadMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.PlasmaMainnet,
  KnownChainIds.PolygonMainnet,
  // UTXO
  KnownChainIds.BitcoinCashMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.LitecoinMainnet,
  KnownChainIds.ZcashMainnet,
  // Cosmos SDK
  KnownChainIds.CosmosMainnet,
  KnownChainIds.MayachainMainnet,
  KnownChainIds.ThorchainMainnet,
  // Solana
  KnownChainIds.SolanaMainnet,
  // Tron
  KnownChainIds.TronMainnet,
  // Sui
  KnownChainIds.SuiMainnet,
  // TON
  KnownChainIds.TonMainnet,
  // NEAR
  KnownChainIds.NearMainnet,
  // Starknet
  KnownChainIds.StarknetMainnet,
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

// Sanity ceiling catching provider deadline bugs (unit inflation, sentinel far-future dates).
// Widest legitimate deadline today is chainflip's 6h - raise this if a swapper ever quotes longer.
export const MAX_QUOTE_DEADLINE_MS = 7 * 24 * 60 * 60 * 1000
