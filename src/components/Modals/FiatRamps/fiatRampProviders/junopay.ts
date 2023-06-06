import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'

import type { CommonFiatCurrencies } from '../config'
import { FiatRampAction } from '../FiatRampsCommon'
import type { CreateUrlProps } from '../types'

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

export const getSupportedJunoPayFiatCurrencies = (): CommonFiatCurrencies[] => {
  return ['USD']
}

export async function getJunoPayAssets(): Promise<AssetId[]> {
  const data = await (async () => {
    try {
      const baseUrl = getConfig().REACT_APP_JUNOPAY_BASE_API_URL
      const apiKey = getConfig().REACT_APP_JUNOPAY_APP_ID
      const { data } = await axios.get<JunoPayResponse>(
        `${baseUrl}crypto-wallet-partners?partner_key=${apiKey}`,
      )
      return data.data
    } catch (e) {
      console.error(e)
    }
  })()

  if (!data) return []

  const junoPayToCurrencyList = data.settings.buy.to_currency
  const allCurrencyList = data.settings.metadata

  return allCurrencyList
    .filter(({ short_name }) => junoPayToCurrencyList.includes(short_name.toUpperCase()))
    .reduce<AssetId[]>((acc, asset) => {
      const { short_name } = asset
      const assetId = adapters.junoPayTickerToAssetId(short_name)
      if (!assetId) return acc
      acc.push(assetId)
      return acc
    }, [])
}

export const createJunoPayUrl = ({ action, address, assetId }: CreateUrlProps): string => {
  const baseUrl = new URL(getConfig().REACT_APP_JUNOPAY_BASE_APP_URL)
  const params = new URLSearchParams()
  const asset = adapters.assetIdToJunoPayTicker(assetId)
  if (!asset) throw new Error('Asset not supported by JunoPay')

  // currently, only buy is supported by JunoPay
  params.set('action', action === FiatRampAction.Sell ? 'sell' : 'buy')
  params.set('currency', asset && asset.toLowerCase())
  params.set('partnerKey', getConfig().REACT_APP_JUNOPAY_APP_ID)
  params.set('name', 'shapeshift')
  params.set('walletAddress', address)

  return `${baseUrl.toString()}?${params.toString()}`
}
