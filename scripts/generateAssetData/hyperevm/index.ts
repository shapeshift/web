import { hyperEvmChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { hyperevm, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(hyperEvmChainId)

  return [...assets, unfreeze(hyperevm)]
}
