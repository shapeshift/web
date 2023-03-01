import { optimismChainId } from '@shapeshiftoss/caip'

import { getRenderedIdenticonBase64 } from '../../service/GenerateAssetIcon'
import { optimism } from '../baseAssets'
import * as coingecko from '../coingecko'

export const getAssets = async () => {
  const assets = await coingecko.getAssets(optimismChainId)
  return [...assets, optimism].map((asset) => ({
    ...asset,
    icon:
      asset.icon ||
      getRenderedIdenticonBase64(asset.assetId, asset.symbol, {
        identiconImage: { size: 128, background: [45, 55, 72, 255] },
        identiconText: { symbolScale: 7, enableShadow: true },
      }),
  }))
}
