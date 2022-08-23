import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'

import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'MtPelerin'],
})

type MtPelerinResponse = {
  [k: string]: {
    symbol: string
    network: string
    decimals: number
    address: string
    // probably we can filter out the assets which are not stable yet?
    isStable: boolean
  }
}

export async function getMtPelerinAssets(): Promise<FiatRampAsset[]> {
  const data = await (async () => {
    try {
      const url = getConfig().REACT_APP_MTPELERIN_ASSETS_API
      const { data } = await axios.get<MtPelerinResponse>(url)
      return data
    } catch (e) {
      moduleLogger.error(e, 'Failed to fetch assets')
    }
  })()

  if (!data) return []

  const mtPelerinAssets = Object.values(data)

  const assets = mtPelerinAssets.reduce<FiatRampAsset[]>((acc, asset) => {
    const { symbol } = asset
    // MtPelerin supports multiple networks for a given asset,
    // so if the asset is already proccessed, skip to the next one
    if (acc.find(asset => asset.symbol === symbol)) return acc
    const assetId = adapters.mtPelerinTickerToAssetId(symbol)
    if (!assetId) return acc
    const mapped = { assetId, symbol, name: '' } // name will be set in useFiatRampCurrencyList hook
    acc.push(mapped)
    return acc
  }, [])

  return assets
}

export const createMtPelerinUrl = (
  action: FiatRampAction,
  asset: string,
  address: string,
): string => {
  /**
   * url usage:
   *   https://developers.mtpelerin.com/integration-guides/web-integration
   * params:
   *   https://developers.mtpelerin.com/integration-guides/options
   */
  const baseUrl = new URL(
    action === FiatRampAction.Sell
      ? getConfig().REACT_APP_MTPELERIN_SELL_URL
      : getConfig().REACT_APP_MTPELERIN_BUY_URL,
  )
  const params = new URLSearchParams()

  params.set('type', 'direct-link')
  params.set('tab', action === FiatRampAction.Sell ? 'sell' : 'buy')
  params.set('tabs', action === FiatRampAction.Sell ? 'sell' : 'buy')
  if (action === FiatRampAction.Sell) params.set('ssc', asset)
  else params.set('bdc', asset)
  params.set('net', adapters.getMtPelerinNetFromMtPelerinAssetTicker(asset))
  params.set('nets', adapters.getMtPelerinNetFromMtPelerinAssetTicker(asset))
  // TODO(stackedq): get the real referral code
  params.set('rfr', 'shapeshift')
  params.set('addr', address)

  return `${baseUrl.toString()}?${params.toString()}`
}
