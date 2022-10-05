import { fromAssetId } from '../../assetId/assetId'
import { AssetId } from '../../assetId/assetId'
import { ChainId } from '../../chainId/chainId'
import {
  avalancheAssetId,
  avalancheChainId,
  btcAssetId,
  btcChainId,
  ethAssetId,
  ethChainId,
} from '../../constants'

/**
 * provided from https://api.mtPelerin.com/currencies/tokens
 */
const MtPelerinSymbolToAssetIds: Record<string, AssetId[]> = {
  ETH: [ethAssetId],
  BTC: [btcAssetId],
  DAI: ['eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f'],
  USDT: ['eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'],
  USDC: [
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
  ],
  jEUR: ['eip155:1/erc20:0x0f17bc9a994b87b5225cfb6a2cd4d667adb4f20b'],
  jCHF: ['eip155:1/erc20:0x53dfea0a8cc2a2a2e425e1c174bc162999723ea0'],
  jGBP: ['eip155:1/erc20:0x7409856cae628f5d578b285b45669b36e7005283'],
  WBTC: ['eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
  AVAX: [avalancheAssetId],
  EURS: ['eip155:1/erc20:0xdb25f211ab05b1c97d595516f45794528a807ad8'],
  EURT: ['eip155:1/erc20:0xc581b735a1688071a1746c968e0798d642ede491'],
  agEUR: ['eip155:1/erc20:0x1a7e4e63778b4f12a199c062f3efdd288afcbce8'],
  FRAX: [
    'eip155:1/erc20:0x853d955acef822db058eb8505911ed77f175b99e',
    'eip155:43114/erc20:0xd24c2ad096400b6fbcd2ad8b24e7acbc21a1da64',
  ],
  UST: ['eip155:1/erc20:0xa693b19d2931d498c5b318df961919bb4aee87a5'],
  EUROC: ['eip155:1/erc20:0x1abaea1f7c830bd89acc67ec4af516284b1bc33c'],
  LUSD: ['eip155:1/erc20:0x5f98805a4e8be255a32880fdec7f6728c6568ba0'],
  XCHF: ['eip155:1/erc20:0xb4272071ecadd69d933adcd19ca99fe80664fc08'],
}
/**
 * The following is the list of assets that Mt Pelerin supports
 * but they're **not supported** (yet?) in ShapeShift
 * {
    '[xdai_mainnet]/0x0000000000000000000000000000000000000000': 'XDAI',
    '[xdai_mainnet]/0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83': 'USDC',
    '[xdai_mainnet]/0x4ECaBa5870353805a9F068101A40E0f32ed605C6': 'USDT',
    '[xdai_mainnet]/0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252': 'WBTC',
    '[xdai_mainnet]/0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1': 'WETH',
    '[xdai_mainnet]/0x9fB1d52596c44603198fB0aee434fac3a679f702': 'jEUR',
    '[xdai_mainnet]/0x2d5563da42b06FbBF9c67b7DC073cF6A7842239e': 'jCHF',
    '[bsc_mainnet]/0x0000000000000000000000000000000000000000': 'BNB',
    '[bsc_mainnet]/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d': 'USDC',
    '[bsc_mainnet]/0x55d398326f99059fF775485246999027B3197955': 'USDT',
    '[bsc_mainnet]/0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c': 'BTCB',
    '[bsc_mainnet]/0x2170ed0880ac9a755fd29b2688956bd959f933f8': 'WETH',
    '[bsc_mainnet]/0xe9e7cea3dedca5984780bafc599bd69add087d56': 'BUSD',
    '[bsc_mainnet]/0x23b8683Ff98F9E4781552DFE6f12Aa32814924e8': 'jEUR',
    '[bsc_mainnet]/0x7c869b5A294b1314E985283d01C702B62224a05f': 'jCHF',
    '[bsc_mainnet]/0x048E9b1ddF9EBbb224812372280e94Ccac443f9e': 'jGBP',
    '[bsc_mainnet]/0x6B8b9AE0627a7622c593A1696859ca753c61A670': 'jZAR',
    '[matic_mainnet]/0x0000000000000000000000000000000000000000': 'MATIC',
    '[matic_mainnet]/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': 'USDC',
    '[matic_mainnet]/0xc2132D05D31c914a87C6611C10748AEb04B58e8F': 'USDT',
    '[matic_mainnet]/0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6': 'WBTC',
    '[matic_mainnet]/0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c': 'jEUR',
    '[matic_mainnet]/0xbD1463F02f61676d53fd183C2B19282BFF93D099': 'jCHF',
    '[matic_mainnet]/0x767058F11800FBA6A682E73A6e79ec5eB74Fac8c': 'jGBP',
    '[matic_mainnet]/0x8ca194A3b22077359b5732DE53373D4afC11DeE3': 'jCAD',
    '[matic_mainnet]/0xa926db7a4CC0cb1736D5ac60495ca8Eb7214B503': 'jSGD',
    '[matic_mainnet]/0x197E5d6CcfF265AC3E303a34Db360ee1429f5d1A': 'jSEK',
    '[matic_mainnet]/0xCB7F1Ef7246D1497b985f7FC45A1A31F04346133': 'jAUD',
    '[matic_mainnet]/0x8343091F2499FD4b6174A46D067A920a3b851FF9': 'jJPY',
    '[matic_mainnet]/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'WETH',
    '[matic_mainnet]/0xE111178A87A3BFf0c8d18DECBa5798827539Ae99': 'EURS',
    '[matic_mainnet]/0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f': 'EURT',
    '[matic_mainnet]/0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4': 'agEUR',
    '[matic_mainnet]/0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89': 'FRAX',
    '[matic_mainnet]/0xa3Fa99A148fA48D14Ed51d610c367C61876997F1': 'MAI',
    '[matic_mainnet]/0xE6469Ba6D2fD6130788E0eA9C0a0515900563b59': 'UST',
    '[tezos_mainnet]/0x0000000000000000000000000000000000000000': 'XTZ',
    '[tezos_mainnet]/KT1JBNFcB5tiycHNdYGYCtR3kk6JaJysUCi8': 'EURL',
    '[arbitrum_mainnet]/0x0000000000000000000000000000000000000000': 'ETH',
    '[arbitrum_mainnet]/0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': 'USDC',
    '[optimism_mainnet]/0x0000000000000000000000000000000000000000': 'ETH',
    '[optimism_mainnet]/0x7F5c764cBc14f9669B88837ca1490cCa17c31607': 'USDC',
    '[avalanche_mainnet]/0x9fB1d52596c44603198fB0aee434fac3a679f702': 'jEUR',
    '[avalanche_mainnet]/0x2d5563da42b06FbBF9c67b7DC073cF6A7842239e': 'jCHF',
    '[avalanche_mainnet]/0x5c49b268c9841AFF1Cc3B0a418ff5c3442eE3F3b': 'MAI',
    '[avalanche_mainnet]/0xb599c3590F42f8F995ECfa0f85D2980B76862fc1': 'UST',
    '[fantom_mainnet]/0x0000000000000000000000000000000000000000': 'FTM',
    '[fantom_mainnet]/0x04068DA6C83AFCFA0e13ba15A6696662335D5B75': 'USDC',
    '[fantom_mainnet]/0xdc301622e621166BD8E82f2cA0A26c13Ad0BE355': 'FRAX',
    '[fantom_mainnet]/0xfB98B335551a418cD0737375a2ea0ded62Ea213b': 'MAI',
    '[fantom_mainnet]/0x846e4D51d7E2043C1a87E0Ab7490B93FB940357b': 'UST',
    '[rsk_mainnet]/0x0000000000000000000000000000000000000000': 'RBTC',
    '[rsk_mainnet]/0x2d919f19d4892381d58edebeca66d5642cef1a1f': 'RDOC',
    '[rsk_mainnet]/0xef213441a85df4d7acbdae0cf78004e1e486bb96': 'USDT',
    '[rsk_mainnet]/0x2acc95758f8b5f583470ba265eb685a8f45fc9d5': 'RIF',
    '[ethChainId]/0x89d71DfbDD6ebeCd0dfe27D55189F903169d2991': 'THDX'
* }
*/

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
