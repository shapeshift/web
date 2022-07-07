import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'

import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'JunoPay'],
})

type OnJunoPayResponse = {
  status: string
  message: string
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

  const junoPayToCurrencyList = data.settings.buy.to_currency
  const allCurrencyList = data.settings.metadata

  const junoPayAssets = allCurrencyList.filter((item: { short_name: string }) =>
    junoPayToCurrencyList.includes(item.short_name.toUpperCase()),
  )

  const assets: FiatRampAsset[] = junoPayAssets.map(
    (asset: { long_name: string; short_name: string; logo_url: string }) => ({
      assetId: adapters.junopayTickerToAssetId(asset.short_name),
      symbol: asset.short_name.toUpperCase(),
      name: asset.long_name,
      imageUrl: asset.logo_url,
    }),
  )

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
