import axios from 'axios'
import fs from 'fs'

import type { AssetId } from '../../assetId/assetId'
import { toAssetId } from '../../assetId/assetId'
import type { ChainId } from '../../chainId/chainId'
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
  gnosisAssetId,
  gnosisChainId,
  ltcChainId,
  optimismAssetId,
  optimismChainId,
  osmosisChainId,
  polygonAssetId,
  polygonChainId,
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

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Polygon)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.PolygonMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Polygon],
          })
          prev[polygonChainId][assetId] = id
        } catch (err) {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Gnosis)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.GnosisMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Gnosis],
          })
          prev[gnosisChainId][assetId] = id
        } catch (err) {
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
      [polygonChainId]: { [polygonAssetId]: 'matic-network' },
      [gnosisChainId]: { [gnosisAssetId]: 'xdai' },
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
      const dirPath = `./src/adapters/coingecko/generated/${chainId}`.replace(':', '_')
      await fs.promises.writeFile(`${dirPath}/adapter.json`, JSON.stringify(assets))
    }),
  )
  console.info('Generated CoinGecko AssetId adapter data.')
}
