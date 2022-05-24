import entries from 'lodash/entries'
import toLower from 'lodash/toLower'

import { fromAssetId } from '../../assetId/assetId'
import { ChainId } from '../../chainId/chainId'

const AssetIdToBanxaTickerMap = {
  'bip122:000000000019d6689c085ae165831e93/slip44:0': 'btc',
  'cosmos:cosmoshub-4/slip44:118': 'atom',
  'eip155:1/slip44:60': 'eth',
  'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'aave',
  'eip155:1/erc20:0xbb0e17ef65f82ab018d8edd776e8dd940327b28b': 'axs',
  'eip155:1/erc20:0x4d224452801aced8b2f0aebe155379bb5d594381': 'ape',
  'eip155:1/erc20:0x0d8775f648430679a709e98d2b0cb6250d2887ef': 'bat',
  'eip155:1/erc20:0x4fabb145d64652a948d72533023f6e7a623c7c53': 'busd',
  'eip155:1/erc20:0x3506424f91fd33084466f402d5d97f05f8e3b4af': 'chz',
  'eip155:1/erc20:0x41e5560054824ea6b0732e656e3ad64e20e94e45': 'cvc',
  'eip155:1/erc20:0xc00e94cb662c3520282e6f5717214004a7f26888': 'comp',
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f': 'dai',
  'eip155:1/erc20:0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c': 'enj',
  'eip155:1/erc20:0x4e15361fd6b4bb609fa63c81a2be19d873717870': 'ftm',
  'eip155:1/erc20:0x165440036ce972c5f8ebef667086707e48b2623e': 'grt',
  'eip155:1/erc20:0xf57e7e7c23978c3caec3c3548e3d615c346e79ff': 'imx',
  'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca': 'link',
  'eip155:1/erc20:0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': 'mkr',
  'eip155:1/erc20:0x0f5d2fb29fb7d3cfee444a200298f468908cc942': 'mana',
  'eip155:1/erc20:0xd26114cd6ee289accf82350c8d8487fedb8a0c07': 'omg',
  'eip155:1/erc20:0x57ab1ec28d129707052df4df418d58a2d46d5f51': 'susd',
  'eip155:1/erc20:0x6b3595068778dd592e39a122f4f5a5cf09c90fe2': 'sushi',
  'eip155:1/erc20:0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': 'snx',
  'eip155:1/erc20:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'uni',
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'usdc',
  'eip155:1/erc20:0x8e870d67f660d95d5be530380d0ec0bd388289e1': 'usdp',
  'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7': 'usdt',
  'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'wbtc'
} as Record<string, string>

const invert = <T extends Record<string, string>>(data: T) =>
  Object.entries(data).reduce((acc, [k, v]) => ((acc[v] = k), acc), {} as Record<string, string>)

const banxaTickerToAssetIdMap = invert(AssetIdToBanxaTickerMap)

export const banxaTickerToAssetId = (id: string): string | undefined => banxaTickerToAssetIdMap[id]

export const AssetIdToBanxaTicker = (assetId: string): string | undefined =>
  AssetIdToBanxaTickerMap[toLower(assetId)]

export const getSupportedBanxaAssets = () =>
  entries(AssetIdToBanxaTickerMap).map(([assetId, ticker]) => ({
    assetId,
    ticker
  }))

/**
 * map ChainIds to Banxa blockchain codes (ETH, BTC, COSMOS),
 * since some Banxa assets could be on multiple chains and their default
 * chain won't be exactly the same as ours.
 */
const chainIdToBanxaBlockchainCodeMap: Record<ChainId, string> = {
  'eip155:1': 'ETH',
  'bip122:000000000019d6689c085ae165831e93': 'BTC',
  'cosmos:cosmoshub-4': 'COSMOS'
} as const

/**
 * Convert a banxa asset identifier to a Banxa chain identifier for use in Banxa HTTP URLs
 *
 * @param {string} banxaAssetId - a Banxa asset string referencing a specific asset; e.g., 'atom'
 * @returns {string} - a Banxa chain identifier; e.g., 'cosmos'
 */
export const getBanxaBlockchainFromBanxaAssetTicker = (banxaAssetId: string): string => {
  const assetId = banxaTickerToAssetId(banxaAssetId.toLowerCase())
  if (!assetId)
    throw new Error(`getBanxaBlockchainFromBanxaAssetTicker: ${banxaAssetId} is not supported`)
  const { chainId } = fromAssetId(assetId)
  return chainIdToBanxaBlockchainCodeMap[chainId]
}
