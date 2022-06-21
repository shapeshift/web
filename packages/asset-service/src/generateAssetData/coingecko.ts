import { adapters, avalancheChainId, ChainId, ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import axios from 'axios'
import lodash from 'lodash'

import { avax, ethereum } from './baseAssets'

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
  tokens: Array<Token>
}
export async function getAssets(
  chainId: ChainId,
  overrideAssets: Array<Asset> = []
): Promise<Asset[]> {
  const { category, explorer, explorerAddressLink, explorerTxLink } = (() => {
    switch (chainId) {
      case ethChainId:
        return {
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: ethereum.explorer,
          explorerAddressLink: ethereum.explorerAddressLink,
          explorerTxLink: ethereum.explorerTxLink
        }
      case avalancheChainId:
        return {
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: avax.explorer,
          explorerAddressLink: avax.explorerAddressLink,
          explorerTxLink: avax.explorerTxLink
        }
      default:
        throw new Error(`no coingecko token support for chainId: ${chainId}`)
    }
  })()

  const { data } = await axios.get<TokenList>(`https://tokens.coingecko.com/${category}/all.json`)

  return data.tokens.reduce<Array<Asset>>((prev, token) => {
    try {
      const assetId = toAssetId({ chainId, assetNamespace: 'erc20', assetReference: token.address })

      const overrideAsset = lodash.find(overrideAssets, (override) => override.assetId == assetId)

      if (overrideAsset) {
        prev.push(overrideAsset)
        return prev
      }

      const asset: Asset = {
        assetId,
        chainId,
        name: token.name,
        precision: token.decimals,
        color: '#FFFFFF', // TODO
        icon: token.logoURI,
        symbol: token.symbol,
        explorer,
        explorerAddressLink,
        explorerTxLink
      }
      prev.push(asset)
    } catch {
      // unable to create assetId, skip token
    }

    return prev
  }, [])
}
