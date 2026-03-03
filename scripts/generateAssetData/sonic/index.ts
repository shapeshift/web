import { sonicChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { sonic, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  try {
    const assets = await coingecko.getAssets(sonicChainId)
    return [...assets, unfreeze(sonic)]
  } catch (err) {
    console.warn(`[sonic] CoinGecko token list unavailable, using native asset only`)
    return [unfreeze(sonic)]
  }
}
