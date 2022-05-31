import { Asset, MarketData } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
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
  marketData: {
    [x: string]: MarketData | undefined
  },
): Record<string, { fiatAmount: string; cryptoAmount: string; marketCap: string }> => {
  const result = {} as Record<
    string,
    { fiatAmount: string; cryptoAmount: string; marketCap: string }
  >
  assets.forEach(asset => {
    const fiatAmount = portfolioAcountRows.find(
      portfolioAccountRow => portfolioAccountRow.assetId === asset.assetId,
    )?.fiatAmount

    const cryptoAmount = portfolioAcountRows.find(
      portfolioAccountRow => portfolioAccountRow.assetId === asset.assetId,
    )?.cryptoAmount

    const assetMarketData = marketData[asset.assetId]

    result[asset.assetId] = {
      fiatAmount: bnOrZero(fiatAmount).toString(),
      cryptoAmount: bnOrZero(cryptoAmount).toString(),
      marketCap: bnOrZero(assetMarketData?.marketCap).toString(),
    }
  })
  return result
}
