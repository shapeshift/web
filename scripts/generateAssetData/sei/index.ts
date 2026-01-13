import { seiChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { sei, unfreeze } from '@shapeshiftoss/utils'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(seiChainId)

  const allAssets = uniqBy(assets.concat([unfreeze(sei)]), 'assetId')

  return allAssets
}
