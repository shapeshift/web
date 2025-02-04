import { baseChainId, foxWifHatAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { base, unfreeze } from '@shapeshiftoss/utils'
import partition from 'lodash/partition'
import uniqBy from 'lodash/uniqBy'
import { getPortalTokens } from 'lib/portals/utils'

import * as coingecko from '../coingecko'

const foxWifHatAsset: Readonly<Asset> = Object.freeze({
  assetId: foxWifHatAssetId,
  chainId: baseChainId,
  name: 'FOX Wif Hat',
  precision: 18,
  symbol: 'FWH',
  color: '#FFFFFF',
  icon: 'https://raw.githubusercontent.com/shapeshift/web/main/scripts/generateAssetData/base/icons/foxwifhat-logo.png',
  explorer: base.explorer,
  explorerAddressLink: base.explorerAddressLink,
  explorerTxLink: base.explorerTxLink,
}) as Readonly<Asset>

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([
    coingecko.getAssets(baseChainId),
    getPortalTokens(base, 'all'),
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
    portalsPools
      .concat(assets)
      .concat(portalsAssets)
      .concat([unfreeze(base), unfreeze(foxWifHatAsset)]),
    'assetId',
  )

  return allAssets
}
