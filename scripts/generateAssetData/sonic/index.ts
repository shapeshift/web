import { sonicChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { sonic, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(sonicChainId)

  return [...assets, unfreeze(sonic)]
}
