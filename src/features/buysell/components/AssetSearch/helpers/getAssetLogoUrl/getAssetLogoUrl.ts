import { getConfig } from 'config'
import { BuySellAsset } from 'features/buysell/contexts/BuySellManagerProvider/BuySellManagerProvider'

export const getAssetLogoUrl = (asset: BuySellAsset) => {
  return getConfig().REACT_APP_GEM_ASSET_LOGO + asset.ticker.toLowerCase() + '.svg'
}
