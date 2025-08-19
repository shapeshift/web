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

export const writeFiles = async (data: Record<string, Record<string, string>>) => {
  const basePath = './src/adapters/coincap/generated/'
  const file = '/adapter.json'

  const writeFile = async ([chainId, assets]: [string, Record<string, string>]) => {
    const dirPath = `${basePath}${chainId}`.replace(':', '_')
    const filePath = `${dirPath}${file}`

    // Create directory if it doesn't exist
    await fs.promises.mkdir(dirPath, { recursive: true })

    // Write the file
    await fs.promises.writeFile(filePath, JSON.stringify(assets))
    console.log(`Written ${Object.keys(assets).length} assets to ${filePath}`)
  }

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

  return ethCoins.reduce(
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

export const parseEnhancedData = (coins: CoinCapCoin[]) => {
  const assetMaps: Record<string, Record<string, string>> = {
    [btcChainId]: bitcoinAssetMap,
    [bchChainId]: bitcoinCashAssetMap,
    [dogeChainId]: dogecoinAssetMap,
    [ltcChainId]: litecoinAssetMap,
    [cosmosChainId]: cosmosAssetMap,
    [thorchainChainId]: thorchainAssetMap,
  }

  // Initialize all supported chain maps
  Object.values(COINCAP_CHAIN_MAP).forEach(({ chainId }) => {
    if (!assetMaps[chainId]) {
      assetMaps[chainId] = {}
    }
  })

  coins.forEach(({ id, tokens, explorer }) => {
    // Method 1: Parse tokens object for multi-chain support
    Object.entries(tokens).forEach(([chainNumber, addresses]) => {
      const chainInfo = COINCAP_CHAIN_MAP[chainNumber]
      if (!chainInfo || !addresses.length) return

      const { chainId, chainReference, assetNamespace } = chainInfo

      // Use first address if multiple exist  
      const address = addresses[0]

      try {
        const assetId = toAssetId({
          chainNamespace: CHAIN_NAMESPACE.Evm, // Most chains are EVM
          chainReference,
          assetNamespace,
          assetReference: address,
        })
        assetMaps[chainId][assetId] = id
      } catch {
        // Skip invalid addresses
      }
    })

    // Method 2: Handle native ETH and all explorer URL parsing (like original parseEthData)
    if (id === 'ethereum') {
      // Handle native ETH
      try {
        const assetId = toAssetId({
          chainNamespace: CHAIN_NAMESPACE.Evm,
          chainReference: CHAIN_REFERENCE.EthereumMainnet,
          assetNamespace: 'slip44',
          assetReference: ASSET_REFERENCE.Ethereum,
        })
        assetMaps[ethChainId][assetId] = id
      } catch {}
    } else if (explorer && explorer.startsWith('https://etherscan.io/token/0x')) {
      // Parse ALL explorer URLs for maximum coverage (original parseEthData logic)
      const address = explorer
        .replace('https://etherscan.io/token/', '')
        .split('#')[0]
        .split('?')[0]
      try {
        const assetId = toAssetId({
          chainNamespace: CHAIN_NAMESPACE.Evm,
          chainReference: CHAIN_REFERENCE.EthereumMainnet,
          assetNamespace: 'erc20',
          assetReference: address, // Keep original case like parseEthData
        })
        assetMaps[ethChainId][assetId] = id
      } catch {}
    }
  })

  return assetMaps
}

export const parseData = (d: CoinCapCoin[]) => parseEnhancedData(d)
