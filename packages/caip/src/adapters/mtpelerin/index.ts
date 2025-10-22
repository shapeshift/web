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
  POL: [polygonAssetId],
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
  WBTC: [
    'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    'eip155:10/erc20:0x68f180fcce6836688e9084f035309e29bf0a2095',
    'eip155:100/erc20:0x8e5bbbb09ed1ebde8674cda39a0c169401db4252',
    'eip155:137/erc20:0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    'eip155:42161/erc20:0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
  ],
  AVAX: [avalancheAssetId],
  'BTC.b': ['eip155:43114/erc20:0x152b9d0fdc40c096757f570a51e494bd4b943e50'],
  cbBTC: [
    'eip155:1/erc20:0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
    'eip155:8453/erc20:0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  ],
  EURA: [
    'eip155:42161/erc20:0xfa5ed56a203466cbbc2430a43c66b9d8723528e7',
    'eip155:137/erc20:0xe0b52e49357fd4daf2c15e02058dce6bc0057db4',
  ],
  EURC: [
    'eip155:1/erc20:0x1abaea1f7c830bd89acc67ec4af516284b1bc33c',
    'eip155:8453/erc20:0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42',
    'eip155:43114/erc20:0xc891eb4cbdeff6e073e859e987815ed1505c2acd',
  ],
  EURS: [
    'eip155:1/erc20:0xdb25f211ab05b1c97d595516f45794528a807ad8',
    'eip155:137/erc20:0xe111178a87a3bff0c8d18decba5798827539ae99',
  ],
  FRAX: [
    'eip155:1/erc20:0x853d955acef822db058eb8505911ed77f175b99e',
    'eip155:137/erc20:0x45c32fa6df82ead1e2ef74d17b76547eddfaff89',
    'eip155:43114/erc20:0xd24c2ad096400b6fbcd2ad8b24e7acbc21a1da64',
  ],
  GHO: ['eip155:1/erc20:0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f'],
  LUSD: [
    'eip155:1/erc20:0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
    'eip155:10/erc20:0xc40f949f8a4e094d1b49a23ea9241d289b7b2819',
  ],
  PAXG: ['eip155:1/erc20:0x45804880de22913dafe09f4980848ece6ecbaf78'],
  WETH: [
    'eip155:56/bep20:0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    'eip155:100/erc20:0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1',
    'eip155:137/erc20:0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
  ],
  BTCB: ['eip155:56/bep20:0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c'],
  crvUSD: ['eip155:1/erc20:0xf939e0a03fb07f59a73314e73794be0e57ac1b4e'],
  XAUt: ['eip155:1/erc20:0x68749665ff8d2d112fa859aa293f07a622782f38'],
  ZCHF: [
    'eip155:1/erc20:0xb58e61c3098d85632df34eecfb899a1ed80921cb',
    'eip155:100/erc20:0xd4dd9e2f021bb459d5a5f6c24c12fe09c5d45553',
  ],
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
