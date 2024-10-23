import type { ChainId, AssetId } from '@shapeshiftoss/caip'
import { Asset, KnownChainIds } from "@shapeshiftoss/types";
import { SupportedChainIds, SwapperName, SwapSource } from '../../types'

// TODO: Get correct caip-19s
const ETHEREUM_ETH_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const ETHEREUM_FLIP_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const ETHEREUM_USDC_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const ETHEREUM_USDT_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const ARBITRUM_ETH_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const ARBITRUM_USDC_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const BITCOIN_BTC_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const SOLANA_SOL_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const SOLANA_USDC_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

export const ChainflipSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.SolanaMainnet,
] as const

export type ChainflipSupportedChainId = (typeof ChainflipSupportedChainIds)[number]

export const ChainflipSupportedAssetIdsByChainId: Partial<Record<KnownChainIds, AssetId[]>> = {
  [KnownChainIds.EthereumMainnet]: [ETHEREUM_ETH_ASSET_ID, ETHEREUM_FLIP_ASSET_ID, ETHEREUM_USDC_ASSET_ID, ETHEREUM_USDT_ASSET_ID],
  [KnownChainIds.ArbitrumMainnet]: [ARBITRUM_ETH_ASSET_ID, ARBITRUM_USDC_ASSET_ID],
  [KnownChainIds.BitcoinMainnet]: [BITCOIN_BTC_ASSET_ID],
  [KnownChainIds.SolanaMainnet]: [SOLANA_SOL_ASSET_ID, SOLANA_USDC_ASSET_ID],
}

export const chainIdToChainflipNetwork: Partial<Record<KnownChainIds, string>> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.ArbitrumMainnet]: 'arb',
  [KnownChainIds.BitcoinMainnet]: 'btc',
  [KnownChainIds.SolanaMainnet]: 'sol',
}

export const assetGasLimits: Partial<Record<string, string>> = {
  ["eth.eth"]: '34000',
  ["flip.eth"]: '52000',
  ["usdc.eth"]: '63000',
  ["usdt.eth"]: '70000',
  ["eth.arb"]: '100000',
  ["usdc.arb"]: '100000',
}

export const CHAINFLIP_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: ChainflipSupportedChainIds as unknown as ChainId[],
  buy: ChainflipSupportedChainIds as unknown as ChainId[],
}

export const CHAINFLIP_SWAP_SOURCE: SwapSource = SwapperName.Chainflip;
export const CHAINFLIP_BOOST_SWAP_SOURCE: SwapSource = `${SwapperName.Chainflip} • Boost`
export const CHAINFLIP_DCA_SWAP_SOURCE: SwapSource = `${SwapperName.Chainflip} • DCA`
export const CHAINFLIP_DCA_BOOST_SWAP_SOURCE: SwapSource = `${SwapperName.Chainflip} • DCA • Boost`

export const usdcAsset: Asset = {
  assetId: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  chainId: KnownChainIds.EthereumMainnet,
  color: "#2373CB",
  explorer:"https://etherscan.io",
  explorerAddressLink:"https://etherscan.io/address/",
  explorerTxLink:"https://etherscan.io/tx/",
  icon:"https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  name:"USDC on Ethereum",
  precision: 6,
  relatedAssetKey: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  symbol:"USDC"
}
