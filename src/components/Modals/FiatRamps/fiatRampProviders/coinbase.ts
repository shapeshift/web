import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId } from '@shapeshiftoss/caip'

import type { CreateUrlProps } from '../types'

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
  // this is a very specific use case and doesn't need an adpater
  const tickers = { [foxAssetId]: 'fox-token' }
  const ticker = tickers[assetId]
  return `https://www.coinbase.com/price/${ticker}`
}
