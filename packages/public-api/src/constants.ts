import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
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

// Namespaces extractTransactionData can serialize. Selling requires something to sign, so a chain
// outside these is buy-side only - reachable as a destination, rejected as a sell asset.
const EXECUTABLE_CHAIN_NAMESPACES: ReadonlySet<string> = new Set([
  CHAIN_NAMESPACE.Evm,
  CHAIN_NAMESPACE.Utxo,
  CHAIN_NAMESPACE.CosmosSdk,
  CHAIN_NAMESPACE.Solana,
])

const EXECUTABLE_SELL_CHAIN_IDS: readonly KnownChainIds[] = SUPPORTED_CHAIN_IDS.filter(
  chainId => EXECUTABLE_CHAIN_NAMESPACES.has(fromChainId(chainId).chainNamespace),
)

const EXECUTABLE_SELL_CHAIN_IDS_SET: ReadonlySet<string> = new Set(EXECUTABLE_SELL_CHAIN_IDS)

export const isExecutableSellChainId = (chainId: string): boolean =>
  EXECUTABLE_SELL_CHAIN_IDS_SET.has(chainId)

// CoW Swap is deliberately absent - it signs an off-chain EIP-712 order rather than a transaction,
// which the wire has no shape for yet, so its quotes would carry no transactionData at all.
export const ENABLED_SWAPPER_NAMES: readonly SwapperName[] = [
  SwapperName.Bebop,
  SwapperName.ButterSwap,
  SwapperName.Chainflip,
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
