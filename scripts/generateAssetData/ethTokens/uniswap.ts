import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import axios from 'axios'

import { colorMap } from '../../../src/lib/asset-service/service/colorMap'

type UniswapToken = {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI: string
}

type UniswapTokenData = {
  name: string
  logoURI: string
  keywords: string[]
  timestamp: string
  tokens: UniswapToken[]
}

export async function getUniswapTokens(): Promise<Asset[]> {
  const { data: uniswapTokenData } = await axios.get<UniswapTokenData>(
    'https://tokens.coingecko.com/uniswap/all.json',
  )

  return uniswapTokenData.tokens.reduce<Asset[]>((acc, token) => {
    const assetReference = token.address.toLowerCase()

    // if no token address, we can't deal with this asset.
    if (!assetReference) return acc

    const assetNamespace = 'erc20'
    const assetId = toAssetId({ chainId, assetNamespace, assetReference })
    const result: Asset = {
      assetId,
      chainId,
      name: token.name,
      precision: token.decimals,
      color: colorMap[assetId] ?? '#FFFFFF',
      // The coingecko API returns thumbnails by default instead of large icons causing blurry images at some places
      // I couldn't find any other option to get the large icon except using the coingecko PRO api, so we are replacing the thumb with large
      icon: token.logoURI.replace('thumb', 'large'),
      symbol: token.symbol,
      explorer: 'https://etherscan.io',
      explorerAddressLink: 'https://etherscan.io/address/',
      explorerTxLink: 'https://etherscan.io/tx/',
      relatedAssetKey: null,
    }
    acc.push(result)
    return acc
  }, [])
}
