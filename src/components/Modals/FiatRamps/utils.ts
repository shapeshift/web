import { matchSorter } from 'match-sorter'

import { FiatRampCurrency } from './FiatRampsCommon'

export const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

export const isSupportedBitcoinAsset = (assetId: string | undefined) =>
  Boolean(assetId === 'bip122:000000000019d6689c085ae165831e93/slip44:0')

export const filterAssetsBySearchTerm = (search: string, assets: FiatRampCurrency[]) => {
  if (!assets) return []

  return matchSorter(assets, search, { keys: ['name', 'assetId', 'symbol'] })
}
