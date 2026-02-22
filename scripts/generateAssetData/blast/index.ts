import { blastChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { blast, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(blastChainId)

  return [...assets, unfreeze(blast)]
}
