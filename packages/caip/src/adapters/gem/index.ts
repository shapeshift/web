import invert from 'lodash/invert'
import toLower from 'lodash/toLower'

import {
  bchAssetId,
  btcAssetId,
  dogeAssetId,
  ethAssetId,
  ltcAssetId,
  polygonAssetId,
} from '../../constants'

const assetIdToGemAssetIdMap = {
  [btcAssetId]: 'bitcoin',
  [dogeAssetId]: 'dogecoin',
  [bchAssetId]: 'bitcoin-cash',
  [ltcAssetId]: 'litecoin',
  [ethAssetId]: 'ethereum',
  [polygonAssetId]: 'matic',
  'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'aave',
  'eip155:1/erc20:0x0d8775f648430679a709e98d2b0cb6250d2887ef': 'basic-attention-token',
  'eip155:1/erc20:0x4fabb145d64652a948d72533023f6e7a623c7c53': 'busd',
  'eip155:1/erc20:0xc00e94cb662c3520282e6f5717214004a7f26888': 'compound-coin',
  'eip155:1/erc20:0xd533a949740bb3306d119cc777fa900ba034cd52': 'curve-dao',
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f': 'dai',
  'eip155:1/erc20:0x056fd409e1d7a124bd7017459dfea2f387b6d5cd': 'gemini-dollar',
  'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca': 'chainlink',
  'eip155:1/erc20:0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': 'maker',
  'eip155:1/erc20:0x75231f58b43240c9718dd58b4967c5114342a86c': 'okb',
  'eip155:1/erc20:0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': 'synthetix-network-token',
  'eip155:1/erc20:0xa4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe': 'usds',
  'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7': 'tether',
  'eip155:1/erc20:0x04fa0d235c4abf4bcf4787af4cf447de572ef828': 'universal-market-access',
  'eip155:1/erc20:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'uniswap',
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'usd-coin',
  'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'wrapped-bitcoin',
  'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'weth',
  'eip155:1/erc20:0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': 'yearn-finance',
} as Record<string, string>

const gemAssetIdToAssetIdMap = invert(assetIdToGemAssetIdMap)

export const gemTickerToAssetId = (id: string): string | undefined => gemAssetIdToAssetIdMap[id]

export const assetIdToGemTicker = (assetId: string): string | undefined =>
  assetIdToGemAssetIdMap[toLower(assetId)]
