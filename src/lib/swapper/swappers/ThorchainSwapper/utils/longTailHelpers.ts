import { avalancheChainId, bscChainId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { Token } from '@uniswap/sdk-core'
import type { Asset } from 'lib/asset-service'

import type { ThornodePoolResponse } from '../types'
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
  const { chainReference: chainReferenceStr, assetReference } = fromAssetId(assetId)
  const chainReference = Number(chainReferenceStr)
  return new Token(chainReference, assetReference, precision, symbol, name)
}

export enum TradeType {
  LongTailToLongTail = 'LongTailToLongTail',
  LongTailToL1 = 'LongTailToL1',
  L1ToLongTail = 'L1ToLongTail',
  L1ToL1 = 'L1ToL1',
}

export function getTradeType(
  sellAssetPool: ThornodePoolResponse | undefined,
  buyAssetPool: ThornodePoolResponse | undefined,
  sellPoolId: string | undefined,
  buyPoolId: string | undefined,
): TradeType | undefined {
  switch (true) {
    case !!sellAssetPool && !!buyAssetPool:
    case !!buyAssetPool && !sellAssetPool && sellPoolId === 'THOR.RUNE':
    case !!sellAssetPool && !buyAssetPool && buyPoolId !== 'THOR.RUNE':
      return TradeType.L1ToL1
    case !sellAssetPool && !buyAssetPool:
      return TradeType.LongTailToLongTail
    case !sellAssetPool && !!buyAssetPool:
      return TradeType.LongTailToL1
    case !!sellAssetPool && !buyAssetPool:
      return TradeType.L1ToLongTail
    default:
      return undefined
  }
}
