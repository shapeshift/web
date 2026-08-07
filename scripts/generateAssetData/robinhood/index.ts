import { robinhoodChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { robinhood, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(robinhoodChainId)

  return [...assets, unfreeze(robinhood)]
}
