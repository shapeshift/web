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
  ASSET_NAMESPACE,
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
  hyperEvmAssetId,
  hyperEvmChainId,
  katanaAssetId,
  katanaChainId,
  ltcChainId,
  mayachainChainId,
  monadAssetId,
  monadChainId,
  nearAssetId,
  nearChainId,
  optimismAssetId,
  optimismChainId,
  plasmaAssetId,
  plasmaChainId,
  polygonAssetId,
  polygonChainId,
  solanaChainId,
  solAssetId,
  starknetAssetId,
  starknetChainId,
  suiAssetId,
  suiChainId,
  thorchainChainId,
  tronAssetId,
  tronChainId,
  zecChainId,
} from '../../constants'
import {
  bitcoinAssetMap,
  bitcoinCashAssetMap,
  cosmosAssetMap,
  dogecoinAssetMap,
  litecoinAssetMap,
  mayachainAssetMap,
  thorchainAssetMap,
  zcashAssetMap,
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
            assetNamespace: 'erc20',
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

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.HyperEvm)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.HyperEvmMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.HyperEvm],
          })
          prev[hyperEvmChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Solana)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Solana,
            chainReference: CHAIN_REFERENCE.SolanaMainnet,
            assetNamespace: 'token',
            assetReference: platforms[CoingeckoAssetPlatform.Solana],
          })
          prev[solanaChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Tron)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Tron,
            chainReference: CHAIN_REFERENCE.TronMainnet,
            assetNamespace: 'trc20',
            assetReference: platforms[CoingeckoAssetPlatform.Tron],
          })
          prev[tronChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Sui)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Sui,
            chainReference: CHAIN_REFERENCE.SuiMainnet,
            assetNamespace: ASSET_NAMESPACE.suiCoin,
            assetReference: platforms[CoingeckoAssetPlatform.Sui],
          })
          prev[suiChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Monad)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.MonadMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Monad],
          })
          prev[monadChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Plasma)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.PlasmaMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Plasma],
          })
          prev[plasmaChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Katana)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.KatanaMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Katana],
          })
          prev[katanaChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Starknet)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Starknet,
            chainReference: CHAIN_REFERENCE.StarknetMainnet,
            assetNamespace: ASSET_NAMESPACE.starknetToken,
            assetReference: platforms[CoingeckoAssetPlatform.Starknet],
          })
          prev[starknetChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Near)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Near,
            chainReference: CHAIN_REFERENCE.NearMainnet,
            assetNamespace: ASSET_NAMESPACE.nep141,
            assetReference: platforms[CoingeckoAssetPlatform.Near],
          })
          prev[nearChainId][assetId] = id
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
      [polygonChainId]: { [polygonAssetId]: 'polygon-ecosystem-token' },
      [gnosisChainId]: { [gnosisAssetId]: 'xdai' },
      [arbitrumChainId]: { [arbitrumAssetId]: 'ethereum' },
      [arbitrumNovaChainId]: { [arbitrumNovaAssetId]: 'ethereum' },
      [baseChainId]: { [baseAssetId]: 'ethereum' },
      [hyperEvmChainId]: { [hyperEvmAssetId]: 'hyperliquid' },
      [monadChainId]: { [monadAssetId]: 'monad' },
      [plasmaChainId]: { [plasmaAssetId]: 'plasma' },
      [katanaChainId]: { [katanaAssetId]: 'katana' },
      [solanaChainId]: { [solAssetId]: 'solana' },
      [starknetChainId]: { [starknetAssetId]: 'starknet' },
      [tronChainId]: { [tronAssetId]: 'tron' },
      [suiChainId]: { [suiAssetId]: 'sui' },
      [nearChainId]: { [nearAssetId]: 'near' },
    },
  )

  return {
    ...assetMap,
    [btcChainId]: bitcoinAssetMap,
    [bchChainId]: bitcoinCashAssetMap,
    [dogeChainId]: dogecoinAssetMap,
    [ltcChainId]: litecoinAssetMap,
    [zecChainId]: zcashAssetMap,
    [cosmosChainId]: cosmosAssetMap,
    [thorchainChainId]: thorchainAssetMap,
    [mayachainChainId]: mayachainAssetMap,
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
