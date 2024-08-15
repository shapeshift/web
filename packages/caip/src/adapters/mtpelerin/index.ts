import type { AssetId } from '../../assetId/assetId'
import { fromAssetId } from '../../assetId/assetId'
import type { ChainId } from '../../chainId/chainId'
import {
  arbitrumAssetId,
  arbitrumChainId,
  avalancheAssetId,
  avalancheChainId,
  baseAssetId,
  baseChainId,
  bscAssetId,
  bscChainId,
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
  ETH: [ethAssetId, optimismAssetId, arbitrumAssetId, baseAssetId],
  MATIC: [polygonAssetId],
  XDAI: [gnosisAssetId],
  BTC: [btcAssetId],
  BNB: [bscAssetId],
  DAI: ['eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f'],
  USDT: [
    'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
    'eip155:10/erc20:0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
    'eip155:100/erc20:0x4ecaba5870353805a9f068101a40e0f32ed605c6',
    'eip155:137/erc20:0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    'eip155:42161/erc20:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  ],
  USDC: [
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'eip155:10/erc20:0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    'eip155:56/bep20:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    'eip155:137/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
    'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  ],
  'USDC.e': [
    'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    'eip155:42161/erc20:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    'eip155:43114/erc20:0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
  ],
  jEUR: [
    'eip155:1/erc20:0x0f17bc9a994b87b5225cfb6a2cd4d667adb4f20b',
    'eip155:56/bep20:0x23b8683ff98f9e4781552dfe6f12aa32814924e8',
    'eip155:100/erc20:0x9fb1d52596c44603198fb0aee434fac3a679f702',
    'eip155:137/erc20:0x4e3decbb3645551b8a19f0ea1678079fcb33fb4c',
  ],
  jCHF: [
    'eip155:1/erc20:0x53dfea0a8cc2a2a2e425e1c174bc162999723ea0',
    'eip155:56/bep20:0x7c869b5a294b1314e985283d01c702b62224a05f',
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
    'eip155:137/erc20:0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
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
  UST: ['eip155:1/erc20:0xa47c8bf37f92abed4a126bda807a7b7498661acd'],
  EUROC: ['eip155:1/erc20:0x1abaea1f7c830bd89acc67ec4af516284b1bc33c'],
  LUSD: [
    'eip155:1/erc20:0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
    'eip155:10/erc20:0xc40f949f8a4e094d1b49a23ea9241d289b7b2819',
  ],
  XCHF: ['eip155:1/erc20:0xb4272071ecadd69d933adcd19ca99fe80664fc08'],
  WETH: [
    'eip155:56/bep20:0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    'eip155:100/erc20:0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1',
    'eip155:137/erc20:0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
  ],
  BTCB: ['eip155:56/bep20:0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c'],
  BUSD: ['eip155:56/bep20:0xe9e7cea3dedca5984780bafc599bd69add087d56'],
  MAI: [
    'eip155:137/erc20:0xa3fa99a148fa48d14ed51d610c367c61876997f1',
    'eip155:43114/erc20:0x5c49b268c9841aff1cc3b0a418ff5c3442ee3f3b',
  ],
  EURC: ['eip155:43114/erc20:0xc891eb4cbdeff6e073e859e987815ed1505c2acd'],
  EUROe: [
    'eip155:1/erc20:0x820802fa8a99901f52e39acd21177b0be6ee2974',
    'eip155:137/erc20:0x820802fa8a99901f52e39acd21177b0be6ee2974',
    'eip155:42161/erc20:0xcf985aba4647a432e60efceeb8054bbd64244305',
    'eip155:43114/erc20:0x820802fa8a99901f52e39acd21177b0be6ee2974',
  ],
  crvUSD: ['eip155:1/erc20:0xf939e0a03fb07f59a73314e73794be0e57ac1b4e'],
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
  [bscChainId]: 'bsc_mainnet',
  [arbitrumChainId]: 'arbitrum_mainnet',
  [baseChainId]: 'base_mainnet',
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
