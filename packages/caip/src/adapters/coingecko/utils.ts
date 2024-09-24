import axios from 'axios'
import fs from 'fs'

import type { AssetId } from '../../assetId/assetId'
import { toAssetId } from '../../assetId/assetId'
import type { ChainId } from '../../chainId/chainId'
import {
  arbitrumAssetId,
  arbitrumChainId,
  arbitrumNovaAssetId,
  arbitrumNovaChainId,
  avalancheAssetId,
  avalancheChainId,
  baseAssetId,
  baseChainId,
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
  polygonAssetId,
  polygonChainId,
  solanaChainId,
  solAssetId,
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

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Arbitrum)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.ArbitrumMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Arbitrum],
          })
          prev[arbitrumChainId][assetId] = id
        } catch (err) {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.ArbitrumNova)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.ArbitrumNovaMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.ArbitrumNova],
          })
          prev[arbitrumNovaChainId][assetId] = id
        } catch (err) {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Base)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.BaseMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Base],
          })
          prev[baseChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Solana)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Solana,
            chainReference: CHAIN_REFERENCE.SolanaMainnet,
            assetNamespace: 'spl',
            assetReference: platforms[CoingeckoAssetPlatform.Solana],
          })
          prev[solanaChainId][assetId] = id
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
      [polygonChainId]: { [polygonAssetId]: 'matic-network' },
      [gnosisChainId]: { [gnosisAssetId]: 'xdai' },
      [arbitrumChainId]: { [arbitrumAssetId]: 'ethereum' },
      [arbitrumNovaChainId]: { [arbitrumNovaAssetId]: 'ethereum' },
      [baseChainId]: { [baseAssetId]: 'ethereum' },
      [solanaChainId]: { [solAssetId]: 'solana' },
    },
  )

  return {
    ...assetMap,
    [btcChainId]: bitcoinAssetMap,
    [bchChainId]: bitcoinCashAssetMap,
    [dogeChainId]: dogecoinAssetMap,
    [ltcChainId]: litecoinAssetMap,
    [cosmosChainId]: cosmosAssetMap,
    [thorchainChainId]: thorchainAssetMap,
  }
}

export const writeFiles = async (data: AssetMap) => {
  await Promise.all(
    Object.entries(data).map(async ([chainId, assets]) => {
      const dirPath = `./src/adapters/coingecko/generated/${chainId}`.replace(':', '_')
      await fs.promises.mkdir(dirPath, { recursive: true })
      await fs.promises.writeFile(`${dirPath}/adapter.json`, JSON.stringify(assets))
    }),
  )
  console.info('Generated CoinGecko AssetId adapter data.')
}
