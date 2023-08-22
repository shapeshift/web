import invert from 'lodash/invert'

import type { AssetId } from '../../assetId/assetId'
import { fromAssetId } from '../../assetId/assetId'
import * as adapters from './generated'
import { isNumeric, isOsmosisLpAsset } from './utils'

export const osmosisGetTokensUrl = 'https://api-osmosis.imperator.co/tokens/v2/all'
export const osmosisGetLpTokensUrl =
  'https://api-osmosis.imperator.co/pools/v2/all?low_liquidity=true'

const generatedAssetIdToOsmosisMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur,
})) as Record<string, string>

const generatedOsmosisToAssetIdMap = invert(generatedAssetIdToOsmosisMap)

export const osmosisToAssetId = (id: string): string | undefined => generatedOsmosisToAssetIdMap[id]

export const assetIdToOsmosis = (assetId: string): string | undefined =>
  generatedAssetIdToOsmosisMap[assetId]

export const osmosisLpAssetIdToPoolId = (lpAssetId: AssetId | string): string | undefined => {
  const { assetReference } = fromAssetId(lpAssetId)
  if (!isOsmosisLpAsset(assetReference)) return undefined

  const segments = assetReference.split('/')
  if (segments.length !== 3) return undefined

  const poolId: string = segments[2]
  if (!isNumeric(poolId)) return undefined

  return poolId
}
