import { berachainChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { berachain, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(berachainChainId)

  return [...assets, unfreeze(berachain)]
}
