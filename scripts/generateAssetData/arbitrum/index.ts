import { arbitrumChainId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'

import { arbitrum } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getRenderedIdenticonBase64 } from '../generateAssetIcon/generateAssetIcon'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(arbitrumChainId)
  return [...assets, arbitrum].map(asset => ({
    ...asset,
    icon:
      asset.icon ||
      getRenderedIdenticonBase64(asset.assetId, asset.symbol, {
        identiconImage: { size: 128, background: [45, 55, 72, 255] },
        identiconText: { symbolScale: 7, enableShadow: true },
      }),
  }))
}
