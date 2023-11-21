import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import type { Asset } from 'lib/asset-service'

import { colorMap } from '../colorMap'

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
      icon: token.logoURI,
      symbol: token.symbol,
      explorer: 'https://etherscan.io',
      explorerAddressLink: 'https://etherscan.io/address/',
      explorerTxLink: 'https://etherscan.io/tx/',
    }
    acc.push(result)
    return acc
  }, [])
}
