import { optimismChainId } from '@shapeshiftoss/caip'

import { optimism } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getRenderedIdenticonBase64 } from '../generateAssetIcon/generateAssetIcon'

export const getAssets = async () => {
  const assets = await coingecko.getAssets(optimismChainId)
  return [...assets, optimism].map(asset => ({
    ...asset,
    icon:
      asset.icon ||
      getRenderedIdenticonBase64(asset.assetId, asset.symbol, {
        identiconImage: { size: 128, background: [45, 55, 72, 255] },
        identiconText: { symbolScale: 7, enableShadow: true },
      }),
  }))
}
