import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { coingeckoUrl } from '@shapeshiftoss/caip/src/adapters'
import { fetchData, parseData } from '@shapeshiftoss/caip/src/adapters/coingecko/utils'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import assert from 'assert'
import { intersection } from 'lodash'
import difference from 'lodash/difference'
import filter from 'lodash/filter'
import orderBy from 'lodash/orderBy'
import { getCoingeckoMarketsRaw } from 'lib/coingecko/utils'
import type { CoinGeckoMarketCap } from 'lib/market-service/coingecko/coingecko-types'

import blacklist from '../blacklist.json'

// blacklist wormhole assets as well - users can't hold a balance and we don't support wormholes
export const filterOutBlacklistedAssets = (unfilteredAssetData: Asset[]) =>
  filter(unfilteredAssetData, asset => {
    return !(blacklist.includes(asset.assetId) || asset.name.toLowerCase().includes('wormhole'))
  })

const getAssetIdsSortedByMarketCap = async (): Promise<AssetId[]> => {
  let page = 1

  const results2d: CoinGeckoMarketCap[][] = []

  while (true) {
    const coingeckoAssets = await getCoingeckoMarketsRaw('market_cap_desc', page, 100)

    results2d.push(coingeckoAssets)

    // Iterate until the market cap ranking is not known
    if (!coingeckoAssets[coingeckoAssets.length - 1]?.market_cap_rank) {
      break
    }

    console.log(`Processed market cap data page ${page}`)

    page++
  }

  const data = await fetchData(coingeckoUrl)
  const chainIdAssetIdMap = parseData(data)

  // Remap from Record<ChainId, Record<AssetId, string>> to Record<string, Record<ChainId, AssetId>>
  const remappedOutput = Object.entries(chainIdAssetIdMap).reduce<
    Record<string, Record<ChainId, AssetId>>
  >((acc, [chainId, assetIdMap]) => {
    Object.entries(assetIdMap).forEach(([assetId, coingeckoId]) => {
      if (!acc[coingeckoId]) acc[coingeckoId] = {}
      acc[coingeckoId][chainId] = assetId
    })
    return acc
  }, {})

  return Array<CoinGeckoMarketCap>()
    .concat(...results2d)
    .filter(
      coingeckoAsset =>
        coingeckoAsset.market_cap_rank !== null && remappedOutput[coingeckoAsset.id] !== undefined,
    )
    .map(coingeckoAsset => {
      // Market cap data in the coingecko API isn't chain specific, so we group the asset across
      // different chains together and rely on the secondary sort to order them sanely.
      return Object.values(remappedOutput[coingeckoAsset.id])
    })
    .flat()
}

export const getSortedAssetIds = async (assetsById: AssetsById) => {
  // Create an array of assetIds sorted by market cap, followed by the remaining ones with no market cap ranking sorted by name
  const assetIdsSortedByMarketCap = await getAssetIdsSortedByMarketCap()

  // Ensure we don't end up with additional assets not in the original dataset
  const filteredAssetIdsSortedByMarketCap = intersection(
    assetIdsSortedByMarketCap,
    Object.keys(assetsById),
  )

  const assetIdsSortedByName = orderBy(
    Object.entries(assetsById),
    ([_assetId, asset]) => `${asset.name}-${asset.chainId}`,
    'asc',
  ).map(([assetId, _asset]) => assetId)
  const nonMarketDataAssetIds = difference(assetIdsSortedByName, filteredAssetIdsSortedByMarketCap)
  const sortedAssetIds = filteredAssetIdsSortedByMarketCap.concat(nonMarketDataAssetIds)

  // Paranoia - be absolutely sure the asset list is not corrupted
  assert(difference(sortedAssetIds, Object.keys(assetsById)).length === 0)

  return sortedAssetIds
}
