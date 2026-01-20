/**
 * Real asset data extracted from generatedAssetData.json for use in tests.
 * isPrimary = relatedAssetKey is null OR equals assetId
 */

import type { SearchableAsset } from './types'

export type TestAsset = Required<SearchableAsset>

// USDC Family - all share the same relatedAssetKey
export const USDC_ETH_PRIMARY: TestAsset = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  name: 'USDC',
  chainId: 'eip155:1',
  relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  isPrimary: true,
}

export const USDC_OPTIMISM: TestAsset = {
  assetId: 'eip155:10/erc20:0x0b2c639c533813f4aa9d7837caf62653d097ff85',
  symbol: 'USDC',
  name: 'USDC',
  chainId: 'eip155:10',
  relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  isPrimary: false,
}

export const USDC_ARBITRUM: TestAsset = {
  assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  symbol: 'USDC',
  name: 'USDC',
  chainId: 'eip155:42161',
  relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  isPrimary: false,
}

// AXLUSDC - in the USDC family (same relatedAssetKey as USDC)
export const AXLUSDC_OPTIMISM: TestAsset = {
  assetId: 'eip155:10/erc20:0xeb466342c4d449bc9f53a865d5cb90586f405215',
  symbol: 'AXLUSDC',
  name: 'Axelar Bridged USDC',
  chainId: 'eip155:10',
  relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  isPrimary: false,
}

export const AXLUSDC_ARBITRUM: TestAsset = {
  assetId: 'eip155:42161/erc20:0xeb466342c4d449bc9f53a865d5cb90586f405215',
  symbol: 'AXLUSDC',
  name: 'Axelar Bridged USDC',
  chainId: 'eip155:42161',
  relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  isPrimary: false,
}

// USDT Family
export const USDT_ETH_PRIMARY: TestAsset = {
  assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  symbol: 'USDT',
  name: 'Tether',
  chainId: 'eip155:1',
  relatedAssetKey: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  isPrimary: true,
}

export const USDT_OPTIMISM: TestAsset = {
  assetId: 'eip155:10/erc20:0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
  symbol: 'USDT',
  name: 'Bridged USDT',
  chainId: 'eip155:10',
  relatedAssetKey: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  isPrimary: false,
}

// USDT0 - in the USDT family (same relatedAssetKey as USDT)
export const USDT0_OPTIMISM: TestAsset = {
  assetId: 'eip155:10/erc20:0x01bff41798a0bcf287b996046ca68b395dbc1071',
  symbol: 'USDT0',
  name: 'USDT0',
  chainId: 'eip155:10',
  relatedAssetKey: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  isPrimary: false,
}

export const USDT0_POLYGON: TestAsset = {
  assetId: 'eip155:137/erc20:0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  symbol: 'USDT0',
  name: 'USDT0',
  chainId: 'eip155:137',
  relatedAssetKey: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  isPrimary: false,
}

// ETH Family
export const ETH_MAINNET: TestAsset = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  chainId: 'eip155:1',
  relatedAssetKey: 'eip155:1/slip44:60',
  isPrimary: true,
}

export const ETH_OPTIMISM: TestAsset = {
  assetId: 'eip155:10/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  chainId: 'eip155:10',
  relatedAssetKey: 'eip155:1/slip44:60',
  isPrimary: false,
}

export const ETH_ARBITRUM: TestAsset = {
  assetId: 'eip155:42161/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  chainId: 'eip155:42161',
  relatedAssetKey: 'eip155:1/slip44:60',
  isPrimary: false,
}

// BTC - chain-specific (null relatedAssetKey)
export const BTC_MAINNET: TestAsset = {
  assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  symbol: 'BTC',
  name: 'Bitcoin',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  relatedAssetKey: null,
  isPrimary: true,
}

// LBTC Family - Lombard Staked BTC
export const LBTC_BASE_PRIMARY: TestAsset = {
  assetId: 'eip155:8453/erc20:0xecac9c5f704e954931349da37f60e39f515c11c1',
  symbol: 'LBTC',
  name: 'Lombard Staked BTC',
  chainId: 'eip155:8453',
  relatedAssetKey: 'eip155:8453/erc20:0xecac9c5f704e954931349da37f60e39f515c11c1',
  isPrimary: true,
}

export const LBTC_ETH: TestAsset = {
  assetId: 'eip155:1/erc20:0x8236a87084f8b84306f72007f36f2618a5634494',
  symbol: 'LBTC',
  name: 'Lombard Staked BTC',
  chainId: 'eip155:1',
  relatedAssetKey: 'eip155:8453/erc20:0xecac9c5f704e954931349da37f60e39f515c11c1',
  isPrimary: false,
}

// AXLUSDT - Axelar Bridged USDT (in USDT family)
export const AXLUSDT_OPTIMISM: TestAsset = {
  assetId: 'eip155:10/erc20:0x7f5373ae26c3e8ffc4c77b7255df7ec1a9af52a6',
  symbol: 'AXLUSDT',
  name: 'Axelar Bridged USDT',
  chainId: 'eip155:10',
  relatedAssetKey: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  isPrimary: false,
}

export const AXLUSDT_ARBITRUM: TestAsset = {
  assetId: 'eip155:42161/erc20:0x7f5373ae26c3e8ffc4c77b7255df7ec1a9af52a6',
  symbol: 'AXLUSDT',
  name: 'Axelar Bridged USDT',
  chainId: 'eip155:42161',
  relatedAssetKey: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  isPrimary: false,
}

// VBUSDC - VaultBridge Bridged USDC (in USDC family)
export const VBUSDC_KATANA: TestAsset = {
  assetId: 'eip155:747474/erc20:0x203a662b0bd271a6ed5a60edfbd04bfce608fd36',
  symbol: 'VBUSDC',
  name: 'VaultBridge Bridged USDC (Katana)',
  chainId: 'eip155:747474',
  relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  isPrimary: false,
}

// Bridged USDT on Optimism (different from AXLUSDT)
export const BRIDGED_USDT_OPTIMISM: TestAsset = {
  assetId: 'eip155:10/erc20:0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
  symbol: 'USDT',
  name: 'Bridged USDT',
  chainId: 'eip155:10',
  relatedAssetKey: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  isPrimary: false,
}

// Bitcoin Cash - separate chain-specific asset (not in BTC family)
export const BCH_MAINNET: TestAsset = {
  assetId: 'bip122:000000000000000000651ef99cb9fcbe/slip44:145',
  symbol: 'BCH',
  name: 'Bitcoin Cash',
  chainId: 'bip122:000000000000000000651ef99cb9fcbe',
  relatedAssetKey: null,
  isPrimary: true,
}

// WBTC - Wrapped Bitcoin (in BTC family conceptually but separate relatedAssetKey)
export const WBTC_ETH_PRIMARY: TestAsset = {
  assetId: 'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  symbol: 'WBTC',
  name: 'Wrapped Bitcoin',
  chainId: 'eip155:1',
  relatedAssetKey: 'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  isPrimary: true,
}

export const WBTC_OPTIMISM: TestAsset = {
  assetId: 'eip155:10/erc20:0x68f180fcce6836688e9084f035309e29bf0a2095',
  symbol: 'WBTC',
  name: 'Wrapped Bitcoin',
  chainId: 'eip155:10',
  relatedAssetKey: 'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  isPrimary: false,
}

// USDC.E - Bridged USDC on Polygon (in USDC family)
export const USDC_E_POLYGON: TestAsset = {
  assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  symbol: 'USDC.E',
  name: 'Bridged USDC (Polygon PoS Bridge)',
  chainId: 'eip155:137',
  relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  isPrimary: false,
}

// USDe - Ethena USDe (separate stablecoin family)
export const USDE_ETH_PRIMARY: TestAsset = {
  assetId: 'eip155:1/erc20:0x4c9edd5852cd905f086c759e8383e09bff1e68b3',
  symbol: 'USDE',
  name: 'USDe',
  chainId: 'eip155:1',
  relatedAssetKey: 'eip155:1/erc20:0x4c9edd5852cd905f086c759e8383e09bff1e68b3',
  isPrimary: true,
}

// Spam tokens for testing (low market cap, copy popular symbols)
export const SPAM_BITCOIN_TOKEN: TestAsset = {
  assetId: 'eip155:1/erc20:0x72e4f9f808c49a2a61de9c5896298920dc4eeea9',
  symbol: 'BITCOIN',
  name: 'HarryPotterObamaSonic10Inu (ETH)',
  chainId: 'eip155:1',
  relatedAssetKey: null,
  isPrimary: false,
}

export const SPAM_BITCOIN_OS_TOKEN: TestAsset = {
  assetId: 'eip155:1/erc20:0xspambitcoinos',
  symbol: 'BTC',
  name: 'Bitcoin OS',
  chainId: 'eip155:1',
  relatedAssetKey: null,
  isPrimary: false,
}

export const SPAM_ETHEREUM_TOKEN: TestAsset = {
  assetId: 'eip155:1/erc20:0xspamethereum123',
  symbol: 'ETHEREUM',
  name: 'HarryPotterTrumpHomerSimpson777Inu',
  chainId: 'eip155:1',
  relatedAssetKey: null,
  isPrimary: false,
}

// Primary asset sets for shouldSearchAllAssets tests
export const PRIMARY_ASSETS = [
  USDC_ETH_PRIMARY,
  USDT_ETH_PRIMARY,
  ETH_MAINNET,
  BTC_MAINNET,
  BCH_MAINNET,
  WBTC_ETH_PRIMARY,
  USDE_ETH_PRIMARY,
  LBTC_BASE_PRIMARY,
]

export const PRIMARY_ASSET_IDS = new Set(PRIMARY_ASSETS.map(a => a.assetId))
export const PRIMARY_SYMBOLS = new Set(PRIMARY_ASSETS.map(a => a.symbol.toLowerCase()))

// All assets including non-primary variants
export const ALL_ASSETS: TestAsset[] = [
  ...PRIMARY_ASSETS,
  USDC_OPTIMISM,
  USDC_ARBITRUM,
  USDC_E_POLYGON,
  AXLUSDC_OPTIMISM,
  AXLUSDC_ARBITRUM,
  USDT_OPTIMISM,
  USDT0_OPTIMISM,
  USDT0_POLYGON,
  ETH_OPTIMISM,
  ETH_ARBITRUM,
  LBTC_ETH,
  WBTC_OPTIMISM,
  AXLUSDT_OPTIMISM,
  AXLUSDT_ARBITRUM,
  VBUSDC_KATANA,
  BRIDGED_USDT_OPTIMISM,
  SPAM_BITCOIN_TOKEN,
  SPAM_BITCOIN_OS_TOKEN,
  SPAM_ETHEREUM_TOKEN,
]
