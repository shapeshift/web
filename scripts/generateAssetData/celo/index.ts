import { celoChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { celo, unfreeze } from '@shapeshiftoss/utils'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(celoChainId)

  const allAssets = uniqBy(assets.concat([unfreeze(celo)]), 'assetId')

  return allAssets
}
