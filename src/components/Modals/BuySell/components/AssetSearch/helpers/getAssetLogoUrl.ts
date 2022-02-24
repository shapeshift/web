import { getConfig } from 'config'

import { BuySellAsset } from '../../../BuySell'

export const getAssetLogoUrl = (asset: BuySellAsset) => {
  return getConfig().REACT_APP_GEM_ASSET_LOGO + asset.ticker.toLowerCase() + '.svg'
}
