import { Asset } from '@shapeshiftoss/types'
import sortBy from 'lodash/sortBy'

export const sortAssetsByAccountAndMarketCap = (
  assets: Asset[],
  enrichedAssetData: Record<
    string,
    { fiatAmount: string; cryptoAmount: string; marketCap: string }
  >,
): Asset[] => {
  return sortBy(assets, [
    asset => {
      return Number(enrichedAssetData[asset.assetId].fiatAmount)
    },
    asset => {
      return Number(enrichedAssetData[asset.assetId].marketCap)
    },
  ]).reverse()
}
