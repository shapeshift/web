import invert from 'lodash/invert'
import toLower from 'lodash/toLower'

import type { AssetId } from '../../index'
import { tickerMap } from './generated'

// As of 2022/06/13 (ETH/BTC/COSMOS assets)
const assetIdToCoinbaseTickerMap = tickerMap as Record<AssetId, string>

const coinbaseAssetIdToAssetIdMap = invert(assetIdToCoinbaseTickerMap)

export const coinbaseTickerToAssetId = (id: string): AssetId | undefined =>
  coinbaseAssetIdToAssetIdMap[id]

export const assetIdToCoinbaseTicker = (assetId: AssetId): string | undefined =>
  assetIdToCoinbaseTickerMap[toLower(assetId)]
