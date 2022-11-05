import { adapters } from '@keepkey/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'

import type { FiatRampAsset } from '../FiatRampsCommon'
import { FiatRampAction } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'JunoPay'],
})

type JunoPayResponse = {
  data: {
    settings: {
      buy: {
        from_currency: string[]
        to_currency: string[]
      }
      sell: {
        from_currency: string[]
        to_currency: string[]
      }
      metadata: {
        short_name: string
        long_name: string
        logo_url: string
      }[]
    }
  }
}

export async function getJunoPayAssets(): Promise<FiatRampAsset[]> {
  const data = await (async () => {
    try {
      const baseUrl = getConfig().REACT_APP_JUNOPAY_BASE_API_URL
      const apiKey = getConfig().REACT_APP_JUNOPAY_APP_ID
      const { data } = await axios.get<JunoPayResponse>(
        `${baseUrl}crypto-wallet-partners?partner_key=${apiKey}`,
      )
      return data.data
    } catch (e) {
      moduleLogger.error(e, 'Failed to fetch assets')
    }
  })()

  if (!data) return []

  const junoPayToCurrencyList = data.settings.buy.to_currency
  const allCurrencyList = data.settings.metadata

  const junoPayAssets = allCurrencyList.filter(({ short_name }) =>
    junoPayToCurrencyList.includes(short_name.toUpperCase()),
  )

  const assets = junoPayAssets.reduce<FiatRampAsset[]>((acc, asset) => {
    const { short_name, long_name: name, logo_url: imageUrl } = asset
    const assetId = adapters.junoPayTickerToAssetId(short_name)
    if (!assetId) return acc
    const symbol = short_name.toUpperCase()
    const mapped = { assetId, symbol, name, imageUrl }
    acc.push(mapped)
    return acc
  }, [])

  return assets
}

export const createJunoPayUrl = (
  action: FiatRampAction,
  asset: string,
  address: string,
): string => {
  const baseUrl = new URL(getConfig().REACT_APP_JUNOPAY_BASE_APP_URL)
  const params = new URLSearchParams()

  // currently, only buy is supported by JunoPay
  params.set('action', action === FiatRampAction.Sell ? 'sell' : 'buy')
  params.set('currency', asset && asset.toLowerCase())
  params.set('partnerKey', getConfig().REACT_APP_JUNOPAY_APP_ID)
  params.set('name', 'shapeshift')
  params.set('walletAddress', address)

  return `${baseUrl.toString()}?${params.toString()}`
}
