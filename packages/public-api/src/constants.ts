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
