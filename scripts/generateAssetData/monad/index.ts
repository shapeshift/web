import { monadChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { monad, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(monadChainId)

  return [...assets, unfreeze(monad)]
}
