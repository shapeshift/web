import type { AssetId } from '../../assetId/assetId'
import { avalancheAssetId, btcAssetId, ethAssetId, ltcAssetId } from '../../constants'

const GateFiIdToAssetIdMap: Record<string, AssetId> = {
  BTC: btcAssetId,
  ETH: ethAssetId,
  AVAX: avalancheAssetId,
  LTC: ltcAssetId,
  '1INCH': 'eip155:1/erc20:0x111111111117dc0aa78b770fa6a738034120c302',
  AXS: 'eip155:1/erc20:0xbb0e17ef65f82ab018d8edd776e8dd940327b28b',
  BAT: 'eip155:1/erc20:0x0d8775f648430679a709e98d2b0cb6250d2887ef',
  'BUSD-ERC20': 'eip155:1/erc20:0x4fabb145d64652a948d72533023f6e7a623c7c53',
  'DAI-ERC20': 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
  DYDX: 'eip155:1/erc20:0x92d6c1e31e14520e676a687f0a93788b716beff5',
  ENJ: 'eip155:1/erc20:0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c',
  EURS: 'eip155:1/erc20:0xdb25f211ab05b1c97d595516f45794528a807ad8',
  LINK: 'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca',
  'MATIC-ERC20': 'eip155:1/erc20:0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
  MKR: 'eip155:1/erc20:0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
  SAND: 'eip155:1/erc20:0x3845badade8e6dff049820680d1f14bd3903a5d0',
  SHIB: 'eip155:1/erc20:0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
  UNI: 'eip155:1/erc20:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  'USDC-ERC20': 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  'USDT-ERC20': 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
}

export const GateFiIdToAssetId = (id: string): AssetId => GateFiIdToAssetIdMap[id]

const AssetIdsToGateFiIdMap: Record<string, string> = {}

for (const key in GateFiIdToAssetIdMap) {
  const value = GateFiIdToAssetIdMap[key]
  AssetIdsToGateFiIdMap[value] = key
}

export const AssetIdToGateFiId = (id: AssetId): string => AssetIdsToGateFiIdMap[id]
