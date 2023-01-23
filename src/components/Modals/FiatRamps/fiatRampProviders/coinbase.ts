import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, foxAssetId } from '@shapeshiftoss/caip'

import type { CommonFiatCurrencies } from '../config'
import type { CreateUrlProps } from '../types'

export const getSupportedCoinbaseFiatCurrencies = (): CommonFiatCurrencies[] => {
  return ['USD']
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
  const ticker = adapters.assetIdToCoinbaseTicker(assetId)
  return `https://www.coinbase.com/price/${ticker}`
}
