import { bscChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { partition } from 'lodash'
import uniqBy from 'lodash/uniqBy'

import { bnbsmartchain } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getPortalTokens } from '../utils/portals'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([
    coingecko.getAssets(bscChainId),
    getPortalTokens(bnbsmartchain),
  ])

  const [assets, _portalsAssets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  // Order matters here - We do a uniqBy and only keep the first of each asset using assetId as a criteria
  // portals pools *have* to be first since Coingecko may also contain the same asset, but won't be able to get the `isPool` info
  // Regular Portals assets however, should be last, as Coingecko is generally more reliable in terms of e.g names and images
  const [portalsPools, portalsAssets] = partition(_portalsAssets, 'isPool')

  const allAssets = uniqBy(
    portalsPools.concat(assets).concat(portalsAssets).concat([bnbsmartchain]),
    'assetId',
  )

  return allAssets
}
