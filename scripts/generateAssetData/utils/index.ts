import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import difference from 'lodash/difference'
import filter from 'lodash/filter'
import orderBy from 'lodash/orderBy'
import type { CoingeckoAsset } from 'lib/coingecko/types'
import { getCoingeckoMarkets } from 'lib/coingecko/utils'

import blacklist from '../blacklist.json'

// blacklist wormhole assets as well - users can't hold a balance and we don't support wormholes
export const filterOutBlacklistedAssets = (unfilteredAssetData: Asset[]) =>
  filter(unfilteredAssetData, asset => {
    return !(blacklist.includes(asset.assetId) || asset.name.toLowerCase().includes('wormhole'))
  })

const getAssetIdsSortedByMarketCap = async (): Promise<AssetId[]> => {
  let page = 1

  const results2d: CoingeckoAsset[][] = []

  while (true) {
    const coingeckoAssets = await getCoingeckoMarkets('market_cap_desc', page)

    results2d.push(coingeckoAssets)

    // Iterate until the market cap ranking is not known
    if (!coingeckoAssets[coingeckoAssets.length - 1]?.details.market_cap_rank) {
      break
    }

    page++
  }

  return Array<CoingeckoAsset>()
    .concat(...results2d)
    .filter(coingeckoAsset => coingeckoAsset.details.market_cap_rank !== null)
    .map(coingeckoAsset => {
      return coingeckoAsset.assetId
    })
}

export const getSortedAssetIds = async (assetsById: AssetsById) => {
  // Create an array of assetIds sorted by market cap, followed by the remaining ones with no market cap ranking sorted by name
  const assetIdsSortedByMarketCap = await getAssetIdsSortedByMarketCap()
  const assetIdsSortedByName = orderBy(
    Object.entries(assetsById),
    ([_assetId, asset]) => asset.name,
    'asc',
  ).map(([assetId, _asset]) => assetId)
  const nonMarketDataAssetIds = difference(assetIdsSortedByName, assetIdsSortedByMarketCap)
  const sortedAssetIds = assetIdsSortedByMarketCap.concat(nonMarketDataAssetIds)

  return sortedAssetIds
}
