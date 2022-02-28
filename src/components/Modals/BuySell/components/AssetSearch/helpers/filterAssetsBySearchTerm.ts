import { matchSorter } from 'match-sorter'
import { CurrencyAsset } from 'components/Modals/BuySell/BuySell'

export const filterAssetsBySearchTerm = (search: string, assets: CurrencyAsset[]) => {
  if (!assets) return []

  return matchSorter(assets, search, { keys: ['name', 'ticker'] })
}
