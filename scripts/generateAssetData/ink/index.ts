import { inkChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { ink, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(inkChainId)

  return [...assets, unfreeze(ink)]
}
