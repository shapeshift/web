import { matchSorter } from 'match-sorter'

import { FiatRampCurrencyBase } from './FiatRampsCommon'

export const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

export const isSupportedBitcoinAsset = (assetId: string) =>
  Boolean(assetId === 'bip122:000000000019d6689c085ae165831e93/slip44:0')

export const filterAssetsBySearchTerm = (search: string, assets: FiatRampCurrencyBase[]) =>
  matchSorter(assets, search, { keys: ['symbol', 'name'] })
