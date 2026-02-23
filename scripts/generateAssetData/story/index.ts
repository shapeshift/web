import { storyChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { story, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(storyChainId)

  return [...assets, unfreeze(story)]
}
