import { suiChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { sui, unfreeze } from '@shapeshiftoss/utils'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([coingecko.getAssets(suiChainId)])

  const [assets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  const allAssets = uniqBy(assets, 'assetId')

  return [unfreeze(sui), ...allAssets]
}
