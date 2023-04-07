import {
  adapters,
  ASSET_NAMESPACE,
  avalancheChainId,
  bscChainId,
  ChainId,
  ethChainId,
  optimismChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import axios from 'axios'

import { Asset } from '../service/AssetService'
import { avax, bnbsmartchain, ethereum, optimism } from './baseAssets'
import { colorMap } from './colorMap'

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
        icon: token.logoURI,
        symbol: token.symbol,
        explorer,
        explorerAddressLink,
        explorerTxLink,
      }
      prev.push(asset)
    } catch {
      // unable to create assetId, skip token
    }

    return prev
  }, [])
}
