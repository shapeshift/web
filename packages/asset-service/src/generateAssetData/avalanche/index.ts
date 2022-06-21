import { avalancheChainId } from '@shapeshiftoss/caip'

import { avax } from '../baseAssets'
import * as coingecko from '../coingecko'

export const getAssets = async () => {
  const assets = await coingecko.getAssets(avalancheChainId)
  assets.push(avax)
  return assets
}
