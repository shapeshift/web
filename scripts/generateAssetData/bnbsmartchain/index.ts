import { bscChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import uniqBy from 'lodash/uniqBy'

import { bnbsmartchain } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getPortalTokens } from '../utils/portals'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([
    coingecko.getAssets(bscChainId),
    getPortalTokens(bnbsmartchain),
  ])

  const [assets, portalsAssets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  const allAssets = uniqBy(assets.concat(portalsAssets).concat([bnbsmartchain]), 'assetId')

  return allAssets
}
