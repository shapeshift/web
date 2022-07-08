import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'

import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'JunoPay'],
})

type OnJunoPayResponse = {
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
      const baseUrl = getConfig().REACT_APP_ONJUNOPAY_BASE_API_URL
      const apiKey = getConfig().REACT_APP_ONJUNOPAY_APP_ID
      const { data } = await axios.get<OnJunoPayResponse>(
        `${baseUrl}crypto-wallet-partners?partner_key=${apiKey}`,
      )
      return data.data
    } catch (e) {
      moduleLogger.error(e, 'Failed to fetch JunoPay assets')
    }
  })()

  if (!data) return []

  const onjunoToCurrencyList = data.settings.buy.to_currency
  const allCurrencyList = data.settings.metadata

  const onjunoAssets = allCurrencyList.filter(({ short_name }) =>
    onjunoToCurrencyList.includes(short_name.toUpperCase()),
  )

  const assets = onjunoAssets.reduce<FiatRampAsset[]>((acc, asset) => {
    const { short_name, long_name: name, logo_url: imageUrl } = asset
    const assetId = adapters.junopayTickerToAssetId(short_name)
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
  const baseUrl = new URL(getConfig().REACT_APP_ONJUNOPAY_BASE_APP_URL)
  const params = new URLSearchParams()

  params.set('action', action === FiatRampAction.Sell ? 'sell' : 'buy')
  params.set('currency', asset && asset.toLowerCase())
  params.set('partnerKey', 'live_SYkQkrlyIQeuQf8AauSOaGTa')
  params.set('name', 'shapeshift')
  params.set('walletAddress', address)

  return `${baseUrl.toString()}?${params.toString()}`
}
