import { getConfig } from 'config'

import { CurrencyAsset } from '../../../BuySell'

export const getAssetLogoUrl = (asset: CurrencyAsset) => {
  return getConfig().REACT_APP_GEM_ASSET_LOGO + asset.ticker.toLowerCase() + '.svg'
}
