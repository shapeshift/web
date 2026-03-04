import { modeChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { modeChain, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(modeChainId)

  return [...assets, unfreeze(modeChain)]
}
