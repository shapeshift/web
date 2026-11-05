import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { makeAsset } from '@shapeshiftoss/utils'

export const getCustomTokenAssets = (
  customTokens: MinimalAsset[],
  assetsById: AssetsByIdPartial,
  chainIdFilterPredicate?: (chainId: ChainId) => boolean,
): Asset[] =>
  customTokens
    .filter(token => !assetsById[token.assetId])
    .filter(token => chainIdFilterPredicate?.(fromAssetId(token.assetId).chainId) ?? true)
    .map(token => makeAsset(token))
