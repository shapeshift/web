import axios from 'axios'
import fs from 'fs'

import { AssetId, toAssetId } from '../../assetId/assetId'
import { ChainId } from '../../chainId/chainId'
import {
  avalancheAssetId,
  avalancheChainId,
  bchChainId,
  bscAssetId,
  bscChainId,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  cosmosChainId,
  dogeChainId,
  ethAssetId,
  ethChainId,
  ltcChainId,
  optimismAssetId,
  optimismChainId,
  osmosisChainId,
  thorchainChainId,
} from '../../constants'
import {
  bitcoinAssetMap,
  bitcoinCashAssetMap,
  cosmosAssetMap,
  dogecoinAssetMap,
  litecoinAssetMap,
  osmosisAssetMap,
  thorchainAssetMap,
} from '../../utils'
import { CoingeckoAssetPlatform } from '.'

export type CoingeckoCoin = {
  id: string
  symbol: string
  name: string
  platforms: Record<string, string>
}

type AssetMap = Record<ChainId, Record<AssetId, string>>

export const fetchData = async (URL: string) => (await axios.get<CoingeckoCoin[]>(URL)).data

export const parseData = (coins: CoingeckoCoin[]): AssetMap => {
  const assetMap = coins.reduce<AssetMap>(
    (prev, { id, platforms }) => {
      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Ethereum)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.EthereumMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Ethereum],
          })
          prev[ethChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Avalanche)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.AvalancheCChain,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Avalanche],
          })
          prev[avalancheChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Optimism)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.OptimismMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Optimism],
          })
          prev[optimismChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.BnbSmartChain)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.BnbSmartChainMainnet,
            assetNamespace: 'bep20',
            assetReference: platforms[CoingeckoAssetPlatform.BnbSmartChain],
          })
          prev[bscChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      return prev
    },
    {
      [ethChainId]: { [ethAssetId]: 'ethereum' },
      [avalancheChainId]: { [avalancheAssetId]: 'avalanche-2' },
      [optimismChainId]: { [optimismAssetId]: 'ethereum' },
      [bscChainId]: { [bscAssetId]: 'binancecoin' },
    },
  )

  return {
    ...assetMap,
    [btcChainId]: bitcoinAssetMap,
    [bchChainId]: bitcoinCashAssetMap,
    [dogeChainId]: dogecoinAssetMap,
    [ltcChainId]: litecoinAssetMap,
    [cosmosChainId]: cosmosAssetMap,
    [osmosisChainId]: osmosisAssetMap,
    [thorchainChainId]: thorchainAssetMap,
  }
}

export const writeFiles = async (data: AssetMap) => {
  await Promise.all(
    Object.entries(data).map(async ([chainId, assets]) => {
      const path = `./src/adapters/coingecko/generated/${chainId}/adapter.json`.replace(':', '_')
      await fs.promises.writeFile(path, JSON.stringify(assets))
    }),
  )
  console.info('Generated CoinGecko AssetId adapter data.')
}
