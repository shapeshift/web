import { arbitrumChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import uniqBy from 'lodash/uniqBy'

import { arbitrum } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getRenderedIdenticonBase64 } from '../generateAssetIcon/generateAssetIcon'
import { getPortalTokens } from '../utils/portals'

export const getAssets = async (): Promise<Asset[]> => {
  const [assets, portalsAssets] = await Promise.all([
    coingecko.getAssets(arbitrumChainId),
    getPortalTokens(arbitrum),
  ])
  const allAssets = uniqBy(assets.concat(portalsAssets).concat([arbitrum]), 'assetId')
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
