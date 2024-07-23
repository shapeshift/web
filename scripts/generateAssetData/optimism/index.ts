import { optimismChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import uniqBy from 'lodash/uniqBy'

import { optimism } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getRenderedIdenticonBase64 } from '../generateAssetIcon/generateAssetIcon'
import { getPortalTokens } from '../utils/portals'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([
    coingecko.getAssets(optimismChainId),
    getPortalTokens(optimism),
  ])

  const [assets, portalsAssets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  const allAssets = uniqBy(assets.concat(portalsAssets).concat([optimism]), 'assetId')

  return allAssets.map(asset => ({
    ...asset,
    icon:
      asset.icon ||
      getRenderedIdenticonBase64(asset.assetId, asset.symbol, {
        identiconImage: { size: 128, background: [45, 55, 72, 255] },
        identiconText: { symbolScale: 7, enableShadow: true },
      }),
  }))
}
