import { adapters } from '@shapeshiftoss/caip'

import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

export const getBanxaAssets = () => {
  const banxaAssets = adapters.getSupportedBanxaAssets()
  const assets: FiatRampAsset[] = banxaAssets.map(asset => ({
    assetId: asset.CAIP19,
    symbol: asset.ticker,
    // TODO(stackedQ): get asset name from redux
    name: asset.ticker,
  }))
  return assets
}

export const createBanxaUrl = async (
  action: FiatRampAction,
  asset: string,
  address: string,
): Promise<string> => {
  const BANXA_URL = 'https://shapeshift.banxa.com?'
  let url = `${BANXA_URL}`
  url += `fiatType=USD&`
  url += `coinType=${asset}&`
  url += `walletAddress=${address}`
  // TODO(stackedQ): select the blockchain from asset caip19 and pass it to the banxa,
  // since some Banxa assets are on multiple chains
  /**
   * based on https://docs.banxa.com/docs/referral-method
   * if sellMode query parameter is not passed `buyMode` will be used
   */
  if (action === FiatRampAction.Sell) url += `&sellMode`
  return url
}
