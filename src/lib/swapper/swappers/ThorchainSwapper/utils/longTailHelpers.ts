import { avalancheChainId, bscChainId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { Token } from '@uniswap/sdk-core'
import type { Asset } from 'lib/asset-service'

import { WAVAX_TOKEN, WBNB_TOKEN, WETH_TOKEN } from './constants'

export const getWrappedToken = (nativeAsset: Asset): Token => {
  switch (nativeAsset.chainId) {
    case ethChainId:
      return WETH_TOKEN
    case bscChainId:
      return WBNB_TOKEN
    case avalancheChainId:
      return WAVAX_TOKEN
    default:
      throw new Error(`getWrappedToken: Unsupported chainId ${nativeAsset.chainId}`)
  }
}

export const getTokenFromAsset = (asset: Asset): Token => {
  const { symbol, name, precision, assetId } = asset
  const chainReference = Number(fromAssetId(assetId).chainReference)
  const assetReference = fromAssetId(assetId).assetReference
  return new Token(chainReference, assetReference, precision, symbol, name)
}
