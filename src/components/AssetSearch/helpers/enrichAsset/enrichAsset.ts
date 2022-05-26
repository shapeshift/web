import { Asset } from '@shapeshiftoss/types'
import { MarketDataState } from 'state/slices/marketDataSlice/marketDataSlice'
import { AccountRowData } from 'state/slices/portfolioSlice/selectors'

/**
 * This function enrich the Asset by adding the user cryptoAmount and marketCap for each asset for facilitate sorting.
 * @param assets
 * @param rowData
 * @param marketData
 * @returns
 */
export const enrichAsset = (
  assets: Asset[],
  rowData: AccountRowData[],
  marketData: MarketDataState,
): Asset[] => {
  return assets.map(asset => {
    const fAmount = rowData.find(d => d.assetId === asset.assetId)?.fiatAmount
    const cAmount = rowData.find(d => d.assetId === asset.assetId)?.cryptoAmount
    const assetMarketData = marketData.crypto.byId[asset.assetId]
    return {
      ...asset,
      fiatAmount: fAmount ? Number(fAmount) : 0,
      cryptoAmount: cAmount ? Number(cAmount) : 0,
      marketCap: assetMarketData ? Number(assetMarketData.marketCap) : 0,
    } as Asset
  })
}
