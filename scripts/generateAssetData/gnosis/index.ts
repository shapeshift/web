import { gnosisChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import partition from 'lodash/partition'
import uniqBy from 'lodash/uniqBy'

import { gnosis } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getPortalTokens } from '../utils/portals'

export const getAssets = async (): Promise<Asset[]> => {
  const [assets, _portalsAssets] = await Promise.all([
    coingecko.getAssets(gnosisChainId),
    getPortalTokens(gnosis),
  ])

  // Order matters here - We do a uniqBy and only keep the first of each asset using assetId as a criteria
  // portals pools *have* to be first since Coingecko may also contain the same asset, but won't be able to get the `isPool` info
  // Regular Portals assets however, should be last, as Coingecko is generally more reliable in terms of e.g names and images
  const [portalsPools, portalsAssets] = partition(_portalsAssets, 'isPool')

  const allAssets = uniqBy(
    portalsPools.concat(assets).concat(portalsAssets).concat([gnosis]),
    'assetId',
  )

  return allAssets
}
