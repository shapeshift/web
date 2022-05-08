import { adapters } from '@shapeshiftoss/caip'
import queryString from 'querystring'

import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

export const getBanxaAssets = () => {
  const banxaAssets = adapters.getSupportedBanxaAssets()
  const assets: FiatRampAsset[] = banxaAssets.map(asset => ({
    assetId: asset.assetId,
    symbol: asset.ticker,
    // name will be set in useFiatRampCurrencyList hook
    name: '',
  }))
  return assets
}

export const createBanxaUrl = (action: FiatRampAction, asset: string, address: string): string => {
  const BANXA_BASE_URL = 'https://shapeshift.banxa.com/'

  const queryConfig = queryString.stringify({
    fiatType: 'USD',
    coinType: asset,
    walletAddress: address,
    /**
     * based on https://docs.banxa.com/docs/referral-method
     * if sellMode query parameter is not passed `buyMode` will be used by default
     */
    [action === FiatRampAction.Sell ? 'sellMode' : 'buyMode']: '',
    /**
     * select the blockchain from asset and pass it to the banxa,
     * since some Banxa assets could be on multiple chains and their default
     * chain won't be exactly the same as ours.
     */
    blockchain: adapters.getBanxaBlockchainFromBanxaAssetTicker(asset),
  })

  return `${BANXA_BASE_URL}?${queryConfig}`
}
