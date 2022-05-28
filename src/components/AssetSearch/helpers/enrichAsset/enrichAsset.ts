import { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { MarketDataState } from 'state/slices/marketDataSlice/marketDataSlice'
import { AccountRowData } from 'state/slices/portfolioSlice/selectors'

/**
 * This function enrich the Asset by adding the user cryptoAmount and marketCap for each asset for facilitate sorting.
 * @param assets
 * @param portfolioAcountRows
 * @param marketData
 * @returns
 */
export const enrichAsset = (
  assets: Asset[],
  portfolioAcountRows: AccountRowData[],
  marketData: MarketDataState,
): Asset[] => {
  return assets.map(asset => {
    const fiatAmount = portfolioAcountRows.find(
      portfoioAccountRow => portfoioAccountRow.assetId === asset.assetId,
    )?.fiatAmount

    const cryptoAmount = portfolioAcountRows.find(
      portfoioAccountRow => portfoioAccountRow.assetId === asset.assetId,
    )?.cryptoAmount

    const assetMarketData = marketData.crypto.byId[asset.assetId]
    return {
      ...asset,
      fiatAmount: bnOrZero(fiatAmount).toString(),
      cryptoAmount: bnOrZero(cryptoAmount).toString(),
      marketCap: bnOrZero(assetMarketData?.marketCap).toString(),
    } as Asset
  })
}
