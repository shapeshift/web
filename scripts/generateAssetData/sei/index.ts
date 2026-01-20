import type { Asset } from '@shapeshiftoss/types'
import { sei, unfreeze } from '@shapeshiftoss/utils'
import partition from 'lodash/partition'
import uniqBy from 'lodash/uniqBy'

import { getPortalTokens } from '@/lib/portals/utils'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([getPortalTokens(sei, 'all')])

  const [_portalsAssets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  // Order matters here - We do a uniqBy and only keep the first of each asset using assetId as a criteria
  // portals pools *have* to be first since they may also exist as regular assets
  const [portalsPools, portalsAssets] = partition(_portalsAssets, 'isPool')

  const allAssets = uniqBy(portalsPools.concat(portalsAssets).concat([unfreeze(sei)]), 'assetId')

  return allAssets
}
