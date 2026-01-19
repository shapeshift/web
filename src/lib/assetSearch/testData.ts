/**
 * Real asset data extracted from generatedAssetData.json for use in tests.
 * isPrimary = relatedAssetKey is null OR equals assetId
 */

import type { AssetId, ChainId } from '@shapeshiftoss/caip'

export type TestAsset = {
  assetId: AssetId
  symbol: string
  name: string
  chainId: ChainId
  relatedAssetKey: AssetId | null
  isPrimary: boolean
}

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

// Primary asset sets for shouldSearchAllAssets tests
export const PRIMARY_ASSETS = [USDC_ETH_PRIMARY, USDT_ETH_PRIMARY, ETH_MAINNET, BTC_MAINNET]

export const PRIMARY_ASSET_IDS = new Set(PRIMARY_ASSETS.map(a => a.assetId))
export const PRIMARY_SYMBOLS = new Set(PRIMARY_ASSETS.map(a => a.symbol.toLowerCase()))

// All assets including non-primary variants
export const ALL_ASSETS = [
  ...PRIMARY_ASSETS,
  USDC_OPTIMISM,
  USDC_ARBITRUM,
  AXLUSDC_OPTIMISM,
  AXLUSDC_ARBITRUM,
  USDT_OPTIMISM,
  USDT0_OPTIMISM,
  USDT0_POLYGON,
  ETH_OPTIMISM,
  ETH_ARBITRUM,
]
