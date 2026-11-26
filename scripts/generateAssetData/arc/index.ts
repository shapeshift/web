import { arcChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { arc, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(arcChainId)

  return [...assets, unfreeze(arc)]
}
