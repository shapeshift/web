import { adapters, caip19 } from '@shapeshiftoss/caip'
import { ChainTypes } from '@shapeshiftoss/types'

import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

const banxaChainMap: Record<ChainTypes, string> = {
  [ChainTypes.Ethereum]: 'ETH',
  [ChainTypes.Bitcoin]: 'BTC',
  [ChainTypes.Cosmos]: 'COSMOS',
  [ChainTypes.Osmosis]: '',
}

export const getBanxaAssets = () => {
  const banxaAssets = adapters.getSupportedBanxaAssets()
  const assets: FiatRampAsset[] = banxaAssets.map(asset => ({
    assetId: asset.CAIP19,
    symbol: asset.ticker,
    // name will be set in useFiatRampCurrencyList hook
    name: '',
  }))
  return assets
}

export const createBanxaUrl = async (
  action: FiatRampAction,
  asset: string,
  address: string,
): Promise<string> => {
  const BANXA_URL = 'https://shapeshift.banxa.com/'
  let url = `${BANXA_URL}?`
  url += `fiatType=USD&`
  url += `coinType=${asset}&`
  url += `walletAddress=${address}&`

  /**
   * select the blockchain from asset caip19 and pass it to the banxa,
   * since some Banxa assets could be on multiple chains and their default
   * chain won't be exactly same as ours.
   */
  const assetCAIP19 = adapters.banxaTickerToCAIP19(asset.toLowerCase())

  if (assetCAIP19) {
    const { chain } = caip19.fromCAIP19(assetCAIP19)
    const banxaChain = banxaChainMap[chain]
    url += `blockchain=${banxaChain}&`
  }

  /**
   * based on https://docs.banxa.com/docs/referral-method
   * if sellMode query parameter is not passed `buyMode` will be used by default
   */
  if (action === FiatRampAction.Sell) url += `sellMode`
  return url
}
