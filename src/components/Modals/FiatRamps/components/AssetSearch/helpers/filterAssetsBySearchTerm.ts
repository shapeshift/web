import { matchSorter } from 'match-sorter'
import { FiatRampCurrency } from 'components/Modals/FiatRamps/FiatRampsCommon'

export const filterAssetsBySearchTerm = (search: string, assets: FiatRampCurrency[]) => {
  if (!assets) return []

  return matchSorter(assets, search, { keys: ['name', 'ticker'] })
}
