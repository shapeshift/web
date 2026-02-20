import { scrollChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { scroll, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(scrollChainId)

  return [...assets, unfreeze(scroll)]
}
