import { tempoChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { tempo, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(tempoChainId)

  return [...assets, unfreeze(tempo)]
}
