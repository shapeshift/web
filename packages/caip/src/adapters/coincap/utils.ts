import axios from 'axios'
import fs from 'fs'

import type { AssetNamespace } from '../../assetId/assetId'
import { toAssetId } from '../../assetId/assetId'
import type { ChainId, ChainReference } from '../../chainId/chainId'
import {
  arbitrumChainId,
  ASSET_REFERENCE,
  avalancheChainId,
  baseChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  ltcChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
  thorchainChainId,
} from '../../constants'
import {
  bitcoinAssetMap,
  bitcoinCashAssetMap,
  cosmosAssetMap,
  dogecoinAssetMap,
  litecoinAssetMap,
  thorchainAssetMap,
} from '../../utils'

export type CoinCapCoin = {
  id: string
  rank: string
  symbol: string
  name: string
  supply: string
  maxSupply: string | null
  marketCapUsd: string
  volumeUsd24Hr: string
  priceUsd: string
  changePercent24Hr: string
  vwap24Hr: string | null
  explorer: string | null
  tokens: Record<string, string[]>
}

// Chain ID to CoinCap network ID mapping
const COINCAP_CHAIN_MAP: Record<
  string,
  { chainId: ChainId; chainReference: ChainReference; assetNamespace: AssetNamespace }
> = {
  '1': {
    chainId: ethChainId,
    chainReference: CHAIN_REFERENCE.EthereumMainnet,
    assetNamespace: 'erc20',
  },
  '10': {
    chainId: optimismChainId,
    chainReference: CHAIN_REFERENCE.OptimismMainnet,
    assetNamespace: 'erc20',
  },
  '56': {
    chainId: bscChainId,
    chainReference: CHAIN_REFERENCE.BnbSmartChainMainnet,
    assetNamespace: 'bep20',
  },
  '101': {
    chainId: solanaChainId,
    chainReference: CHAIN_REFERENCE.SolanaMainnet,
    assetNamespace: 'token',
  },
  '137': {
    chainId: polygonChainId,
    chainReference: CHAIN_REFERENCE.PolygonMainnet,
    assetNamespace: 'erc20',
  },
  '8453': {
    chainId: baseChainId,
    chainReference: CHAIN_REFERENCE.BaseMainnet,
    assetNamespace: 'erc20',
  },
  '42161': {
    chainId: arbitrumChainId,
    chainReference: CHAIN_REFERENCE.ArbitrumMainnet,
    assetNamespace: 'erc20',
  },
  '43114': {
    chainId: avalancheChainId,
    chainReference: CHAIN_REFERENCE.AvalancheCChain,
    assetNamespace: 'erc20',
  },
}

export const writeFiles = async (data: Record<string, Record<string, string>>) => {
  const path = './src/adapters/coincap/generated/'
  const file = '/adapter.json'
  const writeFile = async ([k, v]: [string, unknown]) =>
    await fs.promises.writeFile(`${path}${k}${file}`.replace(':', '_'), JSON.stringify(v))
  await Promise.all(Object.entries(data).map(writeFile))
  console.info('Generated CoinCap AssetId adapter data.')
}

export const fetchData = async (URL: string) =>
  (await axios.get<{ data: CoinCapCoin[] }>(URL)).data.data

export const parseEthData = (data: CoinCapCoin[]) => {
  const ethCoins = data.filter(
    ({ id, explorer }) =>
      (explorer && explorer.startsWith('https://etherscan.io/token/0x')) || id === 'ethereum',
  )

  const ethAssetMap = ethCoins.reduce(
    (acc, { id, explorer }) => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      let assetReference: string = ASSET_REFERENCE.Ethereum
      const assetNamespace = id === 'ethereum' ? 'slip44' : 'erc20'
      if (id !== 'ethereum' && explorer) {
        assetReference = explorer
          .replace('https://etherscan.io/token/', '')
          .split('#')[0]
          .split('?')[0]
      }
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      acc[assetId] = id
      return acc
    },
    {} as Record<string, string>,
  )

  data.forEach(({ id, tokens }) => {
    if (tokens['1'] && tokens['1'].length > 0) {
      // Use first address for Ethereum chain
      const address = tokens['1'][0]
      try {
        const assetId = toAssetId({
          chainNamespace: CHAIN_NAMESPACE.Evm,
          chainReference: CHAIN_REFERENCE.EthereumMainnet,
          assetNamespace: 'erc20',
          assetReference: address,
        })
        ethAssetMap[assetId] = id
      } catch {
        // Skip invalid addresses
      }
    }
  })

  return ethAssetMap
}

export const parseMultiChainTokens = (data: CoinCapCoin[]) => {
  const chainMaps: Record<string, Record<string, string>> = {}

  // Initialize chain maps
  Object.values(COINCAP_CHAIN_MAP).forEach(({ chainId }) => {
    chainMaps[chainId] = {}
  })

  data.forEach(({ id, tokens }) => {
    Object.entries(tokens).forEach(([chainNumber, addresses]) => {
      const chainInfo = COINCAP_CHAIN_MAP[chainNumber]
      if (!chainInfo || !addresses.length) return

      const { chainId, chainReference, assetNamespace } = chainInfo
      const address = addresses[0]

      try {
        const assetId = toAssetId({
          chainNamespace: CHAIN_NAMESPACE.Evm,
          chainReference,
          assetNamespace,
          assetReference: address,
        })
        chainMaps[chainId][assetId] = id
      } catch {
        // Skip invalid addresses
      }
    })
  })

  return chainMaps
}

export const parseData = (d: CoinCapCoin[]) => {
  const result = {
    [ethChainId]: parseEthData(d),
    [btcChainId]: bitcoinAssetMap,
    [bchChainId]: bitcoinCashAssetMap,
    [dogeChainId]: dogecoinAssetMap,
    [ltcChainId]: litecoinAssetMap,
    [cosmosChainId]: cosmosAssetMap,
    [thorchainChainId]: thorchainAssetMap,
  }

  const multiChainTokens = parseMultiChainTokens(d)
  Object.entries(multiChainTokens).forEach(([chainId, tokens]) => {
    if (Object.keys(tokens).length > 0) {
      result[chainId] = { ...result[chainId], ...tokens }
    }
  })

  return result
}
