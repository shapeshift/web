import { matchSorter } from 'match-sorter'

import type { FiatRampAsset } from './FiatRampsCommon'

export const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

export const filterAssetsBySearchTerm = (search: string, assets: FiatRampAsset[]) =>
  matchSorter(assets, search, { keys: ['symbol', 'name'] })
