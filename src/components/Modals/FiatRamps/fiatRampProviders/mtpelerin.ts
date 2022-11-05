import type { AssetId } from '@keepkey/caip'
import { adapters } from '@keepkey/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'

import type { FiatRampAsset } from '../FiatRampsCommon'
import { FiatRampAction } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'MtPelerin'],
})

type MtPelerinResponse = {
  [identifier: string]: {
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

    const assetIds = adapters.mtPelerinSymbolToAssetIds(symbol)
    if (!assetIds || !assetIds.length) return acc
    // if an asset is supported on multiple networks, we need to add them all
    assetIds.forEach(assetId => {
      const mapped = { assetId, symbol, name: '' } // name will be set in useFiatRampCurrencyList hook
      acc.push(mapped)
    })
    return acc
  }, [])

  return assets
}

export const createMtPelerinUrl = (
  action: FiatRampAction,
  assetId: AssetId,
  address: string,
): string => {
  const mtPelerinSymbol = adapters.assetIdToMtPelerinSymbol(assetId)
  if (!mtPelerinSymbol) throw new Error('Asset not supported by MtPelerin')
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
  // Default display tab
  params.set('tab', action === FiatRampAction.Sell ? 'sell' : 'buy')
  // Allows to only display the "Buy" or the "Sell" tab
  params.set('tabs', action === FiatRampAction.Sell ? 'sell' : 'buy')
  if (action === FiatRampAction.Sell) {
    // Default sell tab source currency
    params.set('ssc', mtPelerinSymbol)
    // Default sell tab destination currency
    params.set('sdc', 'EUR')
  } else {
    // Default buy tab destination currency
    params.set('bdc', mtPelerinSymbol)
    // Default buy tab source currency
    params.set('bsc', 'EUR')
  }
  const network = adapters.getMtPelerinNetFromAssetId(assetId)
  if (!network) throw new Error('Network not supported by MtPelerin')
  // Default network
  params.set('net', network)
  // List of authorized networks
  params.set('nets', network)
  params.set('rfr', getConfig().REACT_APP_MTPELERIN_REFERRAL_CODE)
  params.set('addr', address)

  return `${baseUrl.toString()}?${params.toString()}`
}
