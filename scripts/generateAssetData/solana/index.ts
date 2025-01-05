import { solanaChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { solana } from '@shapeshiftoss/utils/src/assetData/baseAssets'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([coingecko.getAssets(solanaChainId)])

  const [assets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  const allAssets = uniqBy(assets, 'assetId')

  return [solana, ...allAssets]
}
