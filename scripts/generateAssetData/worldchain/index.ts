import { worldChainChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { unfreeze, worldchain } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(worldChainChainId)

  return [...assets, unfreeze(worldchain)]
}
