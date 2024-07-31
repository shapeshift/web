import { avalancheChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import uniqBy from 'lodash/uniqBy'

import { avax } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getPortalTokens } from '../utils/portals'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([
    coingecko.getAssets(avalancheChainId),
    getPortalTokens(avax),
  ])

  const [assets, portalsAssets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  const allAssets = uniqBy(portalsAssets.concat(assets).concat([avax]), 'assetId')

  return allAssets
}
