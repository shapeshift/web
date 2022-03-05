import { GemCurrency } from '../../../FiatRamps'

const ASSET_LOGO_BASE_URI =
  'https://gem-widgets-assets.s3-us-west-2.amazonaws.com/currencies/crypto/'

export const getAssetLogoUrl = (asset: GemCurrency) => {
  return ASSET_LOGO_BASE_URI + asset.ticker.toLowerCase() + '.svg'
}
