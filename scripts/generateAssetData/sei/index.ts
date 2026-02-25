import { seiChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { sei, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(seiChainId)

  return [...assets, unfreeze(sei)]
}
