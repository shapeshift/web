import type { ChainId } from '@shapeshiftoss/caip'
import {
  adapters,
  arbitrumChainId,
  arbitrumNovaChainId,
  ASSET_NAMESPACE,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import axios from 'axios'

import { colorMap } from './../../src/lib/asset-service/service/colorMap'
import {
  arbitrum,
  arbitrumNova,
  avax,
  base,
  bnbsmartchain,
  ethereum,
  gnosis,
  optimism,
  polygon,
  solana,
} from './baseAssets'

type Token = {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI: string
}

type TokenList = {
  name: string
  logoURI: string
  keywords: string[]
  timestamp: string
  tokens: Token[]
}
export async function getAssets(chainId: ChainId): Promise<Asset[]> {
  const { assetNamespace, category, explorer, explorerAddressLink, explorerTxLink } = (() => {
    switch (chainId) {
      case ethChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: ethereum.explorer,
          explorerAddressLink: ethereum.explorerAddressLink,
          explorerTxLink: ethereum.explorerTxLink,
        }
      case avalancheChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: avax.explorer,
          explorerAddressLink: avax.explorerAddressLink,
          explorerTxLink: avax.explorerTxLink,
        }
      case optimismChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: optimism.explorer,
          explorerAddressLink: optimism.explorerAddressLink,
          explorerTxLink: optimism.explorerTxLink,
        }
      case bscChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.bep20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: bnbsmartchain.explorer,
          explorerAddressLink: bnbsmartchain.explorerAddressLink,
          explorerTxLink: bnbsmartchain.explorerTxLink,
        }
      case polygonChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: polygon.explorer,
          explorerAddressLink: polygon.explorerAddressLink,
          explorerTxLink: polygon.explorerTxLink,
        }
      case gnosisChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: gnosis.explorer,
          explorerAddressLink: gnosis.explorerAddressLink,
          explorerTxLink: gnosis.explorerTxLink,
        }
      case arbitrumChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: arbitrum.explorer,
          explorerAddressLink: arbitrum.explorerAddressLink,
          explorerTxLink: arbitrum.explorerTxLink,
        }
      case arbitrumNovaChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: arbitrumNova.explorer,
          explorerAddressLink: arbitrumNova.explorerAddressLink,
          explorerTxLink: arbitrumNova.explorerTxLink,
        }
      case baseChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: base.explorer,
          explorerAddressLink: base.explorerAddressLink,
          explorerTxLink: base.explorerTxLink,
        }
      case solanaChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.spl,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: solana.explorer,
          explorerAddressLink: solana.explorerAddressLink,
          explorerTxLink: solana.explorerTxLink,
        }
      default:
        throw new Error(`no coingecko token support for chainId: ${chainId}`)
    }
  })()

  const { data } = await axios.get<TokenList>(`https://tokens.coingecko.com/${category}/all.json`)

  return data.tokens.reduce<Asset[]>((prev, token) => {
    try {
      const assetId = toAssetId({ chainId, assetNamespace, assetReference: token.address })

      const asset: Asset = {
        assetId,
        chainId,
        name: token.name,
        precision: token.decimals,
        color: colorMap[assetId] ?? '#FFFFFF',
        // The coingecko API returns thumbnails by default instead of large icons causing blurry images at some places
        // I couldn't find any other option to get the large icon except using the coingecko PRO api, so we are replacing the thumb with large
        icon: token.logoURI.replace('thumb', 'large'),
        symbol: token.symbol,
        explorer,
        explorerAddressLink,
        explorerTxLink,
        relatedAssetKey: undefined,
      }
      prev.push(asset)
    } catch {
      // unable to create assetId, skip token
    }

    return prev
  }, [])
}
