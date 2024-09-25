import { solanaChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import uniqBy from 'lodash/uniqBy'

import { solana } from '../baseAssets'
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
