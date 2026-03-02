import { plumeChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { plume, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(plumeChainId)

  return [...assets, unfreeze(plume)]
}
