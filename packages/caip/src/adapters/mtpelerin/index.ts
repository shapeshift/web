import type { AssetId } from '../../assetId/assetId'
import { fromAssetId } from '../../assetId/assetId'
import type { ChainId } from '../../chainId/chainId'
import {
  arbitrumAssetId,
  arbitrumChainId,
  avalancheAssetId,
  avalancheChainId,
  btcAssetId,
  btcChainId,
  ethAssetId,
  ethChainId,
  gnosisAssetId,
  gnosisChainId,
  optimismAssetId,
  optimismChainId,
  polygonAssetId,
  polygonChainId,
} from '../../constants'

/**
 * provided from https://api.mtPelerin.com/currencies/tokens
 */
const MtPelerinSymbolToAssetIds: Record<string, AssetId[]> = {
  ETH: [ethAssetId, optimismAssetId, arbitrumAssetId],
  MATIC: [polygonAssetId],
  XDAI: [gnosisAssetId],
  BTC: [btcAssetId],
  DAI: ['eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f'],
  USDT: [
    'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
    'eip155:10/erc20:0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    'eip155:100/erc20:0x4ecaba5870353805a9f068101a40e0f32ed605c6',
    'eip155:137/erc20:0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    'eip155:42161/erc20:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  ],
  USDC: [
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
    'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
  ],
  jEUR: [
    'eip155:1/erc20:0x0f17bc9a994b87b5225cfb6a2cd4d667adb4f20b',
    'eip155:137/erc20:0x4e3decbb3645551b8a19f0ea1678079fcb33fb4c',
    'eip155:100/erc20:0x9fb1d52596c44603198fb0aee434fac3a679f702',
  ],
  jCHF: [
    'eip155:1/erc20:0x53dfea0a8cc2a2a2e425e1c174bc162999723ea0',
    'eip155:100/erc20:0x2d5563da42b06fbbf9c67b7dc073cf6a7842239e',
    'eip155:137/erc20:0xbd1463f02f61676d53fd183c2b19282bff93d099',
  ],
  jGBP: [
    'eip155:1/erc20:0x7409856cae628f5d578b285b45669b36e7005283',
    'eip155:137/erc20:0x767058f11800fba6a682e73a6e79ec5eb74fac8c',
  ],
  WBTC: [
    'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    'eip155:10/erc20:0x68f180fcce6836688e9084f035309e29bf0a2095',
    'eip155:100/erc20:0x8e5bbbb09ed1ebde8674cda39a0c169401db4252',
    'eip155:42161/erc20:0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
  ],
  AVAX: [avalancheAssetId],
  EURS: [
    'eip155:1/erc20:0xdb25f211ab05b1c97d595516f45794528a807ad8',
    'eip155:137/erc20:0xe111178a87a3bff0c8d18decba5798827539ae99',
  ],
  EURT: ['eip155:1/erc20:0xc581b735a1688071a1746c968e0798d642ede491'],
  agEUR: [
    'eip155:1/erc20:0x1a7e4e63778b4f12a199c062f3efdd288afcbce8',
    'eip155:137/erc20:0xe0b52e49357fd4daf2c15e02058dce6bc0057db4',
  ],
  FRAX: [
    'eip155:1/erc20:0x853d955acef822db058eb8505911ed77f175b99e',
    'eip155:137/erc20:0x45c32fa6df82ead1e2ef74d17b76547eddfaff89',
    'eip155:43114/erc20:0xd24c2ad096400b6fbcd2ad8b24e7acbc21a1da64',
  ],
  UST: ['eip155:1/erc20:0xa693b19d2931d498c5b318df961919bb4aee87a5'],
  EUROC: ['eip155:1/erc20:0x1abaea1f7c830bd89acc67ec4af516284b1bc33c'],
  LUSD: ['eip155:1/erc20:0x5f98805a4e8be255a32880fdec7f6728c6568ba0'],
  XCHF: ['eip155:1/erc20:0xb4272071ecadd69d933adcd19ca99fe80664fc08'],
  WETH: ['eip155:100/erc20:0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1'],
}

export const mtPelerinSymbolToAssetIds = (id: string): AssetId[] => MtPelerinSymbolToAssetIds[id]

export const assetIdToMtPelerinSymbol = (assetId: AssetId): string | undefined => {
  return Object.entries(MtPelerinSymbolToAssetIds)
    .filter(([, assetIds]) => assetIds.includes(assetId))
    .map(([key]) => key)[0]
}
/**
 * map ChainIds to MtPelerin network,
 * since some MtPelerin assets could be on multiple chains and their default
 * chain won't be exactly the same as ours.
 *
 * https://developers.mtPelerin.com/integration-guides/options -> "net"
 * source of truth per MtPelerin
 */
const chainIdToMtPelerinNetworkCodeMap: Record<ChainId, string> = {
  [ethChainId]: 'mainnet',
  [btcChainId]: 'bitcoin_mainnet',
  [avalancheChainId]: 'avalanche_mainnet', // this is actually the C-Chain
  [optimismChainId]: 'optimism_mainnet',
  [polygonChainId]: 'matic_mainnet',
  [gnosisChainId]: 'xdai_mainnet',
  [arbitrumChainId]: 'arbitrum_mainnet',
} as const

/**
 * Convert a mtPelerin asset identifier to a MtPelerin chain identifier for use in MtPelerin HTTP URLs
 *
 * @param {string} assetId - an assetId string referencing a specific asset; e.g., ethAssetId
 * @returns {string} - a MtPelerin network identifier; e.g., 'mainnet'
 */
export const getMtPelerinNetFromAssetId = (assetId: AssetId): string | undefined => {
  const { chainId } = fromAssetId(assetId)
  return chainIdToMtPelerinNetworkCodeMap[chainId]
}
