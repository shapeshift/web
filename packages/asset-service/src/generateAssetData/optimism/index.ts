import { optimismChainId } from '@shapeshiftoss/caip'

import { optimism } from '../baseAssets'
import * as coingecko from '../coingecko'

export const getAssets = async () => {
  const assets = await coingecko.getAssets(optimismChainId)
  assets.push(optimism)
  return assets
}
