import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'
import { isSome } from 'lib/utils'

import { FiatRampAction } from '../FiatRampsCommon'
import type { CreateUrlProps } from '../types'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'MtPelerin'],
})

type MtPelerinResponse = {
  [identifier: string]: {
    symbol: string
  }
}

export async function getMtPelerinAssets(): Promise<AssetId[]> {
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

  const mtPelerinSymbols = Object.values(data).map(({ symbol }) => symbol)
  return Array.from(
    new Set(mtPelerinSymbols.flatMap(symbol => adapters.mtPelerinSymbolToAssetIds(symbol))),
  ).filter(isSome)
}

export const createMtPelerinUrl = ({
  action,
  assetId,
  options: { mode, language },
}: CreateUrlProps): string => {
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
  //@TODO: Figure out how to sign a message using the wallet for us to be able to do this.
  //https://developers.mtpelerin.com/integration-guides/options
  // params.set('addr', address)
  // params.set('code', code)
  params.set('lang', language)
  params.set('mode', mode)

  return `${baseUrl.toString()}?${params.toString()}`
}
