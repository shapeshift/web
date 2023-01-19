import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId } from '@shapeshiftoss/caip'

import type { CommonFiatCurrencies } from '../config'
import type { CreateUrlProps } from '../types'

export const getSupportedCoinbaseFiatCurrencies = (): CommonFiatCurrencies[] => {
  return ['USD']
}

const coinbaseAssets = {
  [foxAssetId]: 'fox-token',
}

const assetIdToCoinbaseTicker = (assetId: AssetId) => {
  return coinbaseAssets[assetId]
}

type SupportedAssetReturn = {
  buy: AssetId[]
  sell: AssetId[]
}

export const getCoinbaseSupportedAssets = (): SupportedAssetReturn => {
  return {
    buy: [foxAssetId],
    sell: [foxAssetId],
  }
}

export const createCoinbaseUrl = ({ assetId }: CreateUrlProps): string => {
  const ticker = assetIdToCoinbaseTicker(assetId)
  return `https://www.coinbase.com/price/${ticker}`
}
