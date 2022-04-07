import { matchSorter } from 'match-sorter'
import { GemCurrency } from 'components/Modals/FiatRamps/FiatRamps'

export const filterAssetsBySearchTerm = (search: string, assets: GemCurrency[]) => {
  if (!assets) return []

  return matchSorter(assets, search, { keys: ['name', 'ticker'] })
}
