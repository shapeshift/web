import { unichainChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { unfreeze, unichainChain } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(unichainChainId)

  return [...assets, unfreeze(unichainChain)]
}
