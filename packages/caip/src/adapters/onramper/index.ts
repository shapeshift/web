import entries from 'lodash/entries'

import {
  avalancheAssetId,
  bchAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  ltcAssetId,
} from '../../constants'
import { AssetId } from './../../assetId/assetId'

type OnRamperTokenId = string

export const AssetIdToOnRamperIdMap: Record<AssetId, OnRamperTokenId[]> = {
  [btcAssetId]: ['BTC'],
  [cosmosAssetId]: ['ATOM'],
  [ethAssetId]: ['ETH'],
  [avalancheAssetId]: ['AVAX'],
  [dogeAssetId]: ['DOGE'],
  [ltcAssetId]: ['LTC'],
  [bchAssetId]: ['BCH'],
  'eip155:1/erc20:0x111111111117dc0aa78b770fa6a738034120c302': ['1INCH'],
  'eip155:1/erc20:0xbcca60bb61934080951369a648fb03df4f96263c': ['AUSDC'],
  'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': ['AAVE_ECR20'],
  'eip155:1/erc20:0xbb0e17ef65f82ab018d8edd776e8dd940327b28b': ['AXS'],
  'eip155:1/erc20:0x4d224452801aced8b2f0aebe155379bb5d594381': ['APE'],
  'eip155:1/erc20:0x0d8775f648430679a709e98d2b0cb6250d2887ef': ['BAT_ERC20'],
  'eip155:1/erc20:0x4fabb145d64652a948d72533023f6e7a623c7c53': ['BUSD'],
  'eip155:1/erc20:0x3506424f91fd33084466f402d5d97f05f8e3b4af': ['CHZ'],
  'eip155:1/erc20:0xc00e94cb662c3520282e6f5717214004a7f26888': ['COMP'],
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f': ['DAI', 'DAI_ERC20'],
  'eip155:1/erc20:0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c': ['ENJ'],
  'eip155:1/erc20:0x4e15361fd6b4bb609fa63c81a2be19d873717870': ['FTM'],
  'eip155:1/erc20:0xf57e7e7c23978c3caec3c3548e3d615c346e79ff': ['IMX'],
  'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca': ['LINK'],
  'eip155:1/erc20:0x5f98805a4e8be255a32880fdec7f6728c6568ba0': ['LUSD_ERC20'],
  'eip155:1/erc20:0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': ['MKR', 'MKR_ERC20'],
  'eip155:1/erc20:0x0f5d2fb29fb7d3cfee444a200298f468908cc942': ['MANA', 'MANA_ERC20'],
  'eip155:1/erc20:0x69af81e73a73b40adf4f3d4223cd9b1ece623074': ['MASK', 'MASK_ERC20'],
  'eip155:1/erc20:0xb26631c6dda06ad89b93c71400d25692de89c068': ['MINDS', 'MINDS_ERC20'],
  'eip155:1/erc20:0xd26114cd6ee289accf82350c8d8487fedb8a0c07': ['OMG'],
  'eip155:1/erc20:0x75231f58b43240c9718dd58b4967c5114342a86c': ['OKB_ERC20'],
  'eip155:1/erc20:0x83e6f1e41cdd28eaceb20cb649155049fac3d5aa': ['POLS_ERC20'],
  'eip155:1/erc20:0x57ab1ec28d129707052df4df418d58a2d46d5f51': ['SUSDC'],
  'eip155:1/erc20:0x6b3595068778dd592e39a122f4f5a5cf09c90fe2': ['SUSHI', 'SUSHI_ERC20'],
  'eip155:1/erc20:0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': ['SNX'],
  'eip155:1/erc20:0xae7ab96520de3a18e5e111b5eaab095312d7fe84': ['STETH'],
  'eip155:1/erc20:0x0000000000085d4780b73119b644ae5ecd22b376': ['TUSD'],
  'eip155:1/erc20:0x04fa0d235c4abf4bcf4787af4cf447de572ef828': ['UMA'],
  'eip155:1/erc20:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': ['UNI', 'UNI-ERC20'],
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': ['USDC'],
  'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7': ['USDT'],
  'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': ['WBTC'],
  'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': ['WETH'],
  'eip155:1/erc20:0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': ['YFI'],
  'eip155:1/erc20:0xe41d2489571d322189246dafa5ebde1f4699f498': ['ZRX'],
  'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': ['USDC_CCHAIN'],
}

// explodes and inverts the assetId => tokenId[] map by creating a 1to1 token => assetId mapping
const invertMap = () => {
  const invertedMap: Record<OnRamperTokenId, AssetId> = {}
  entries(AssetIdToOnRamperIdMap).flatMap(([assetId, idList]) =>
    idList.forEach((id) => {
      invertedMap[id] = assetId
    }),
  )
  return invertedMap
}

const OnRamperIdToAssetIdMap = invertMap()

export const getOnRamperSupportedAssets = () => {
  entries(AssetIdToOnRamperIdMap).map(([assetId, tokenId]) => ({
    assetId,
    token: tokenId,
  }))
}

export const onRamperTokenIdToAssetId = (tokenId: OnRamperTokenId): AssetId | undefined =>
  OnRamperIdToAssetIdMap[tokenId]

export const assetIdToOnRamperTokenList = (assetId: AssetId): OnRamperTokenId[] | undefined =>
  AssetIdToOnRamperIdMap[assetId]
