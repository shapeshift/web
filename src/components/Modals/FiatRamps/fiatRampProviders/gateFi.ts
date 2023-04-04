import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import uniq from 'lodash/uniq'
import { logger } from 'lib/logger'
import { isSome } from 'lib/utils'

import type { CommonFiatCurrencies } from '../config'
import type { CreateUrlProps } from '../types'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'GateFi'],
})

type GateFiResponse = {
  crypto: {
    id: string
  }[]
}

export const getSupportedGateFiFiatCurrencies = (): CommonFiatCurrencies[] => {
  return ['USD', 'BRL', 'COP', 'EUR', 'GBP', 'IDR', 'MXN', 'MYR', 'PEN', 'PHP', 'THB', 'VND']
}

export async function getGateFiAssets(): Promise<AssetId[]> {
  const data = await (async () => {
    try {
      const url = getConfig().REACT_APP_GATEFI_ASSETS_URL
      const apiKey = getConfig().REACT_APP_GATEFI_API_KEY
      const { data } = await axios.get<GateFiResponse>(url, {
        headers: { 'api-key': apiKey },
      })
      return data
    } catch (e) {
      moduleLogger.error(e, 'Failed to fetch GateFi assets')
    }
  })()

  if (!data) return []

  const gateFiAssetIds = Object.values(data.crypto).map(({ id }) => id)
  return uniq(gateFiAssetIds.map(adapters.GateFiIdToAssetId).filter(isSome))
}

export const createGateFiUrl = ({ assetId, address }: CreateUrlProps): string => {
  const asset = adapters.AssetIdToGateFiId(assetId)
  if (!asset) throw new Error('Asset not supported by GateFi')
  const baseUrl = getConfig().REACT_APP_GATEFI_API_BUY_URL
  const merchantId = getConfig().REACT_APP_GATEFI_ID

  const params = new URLSearchParams()
  params.set('merchantId', merchantId)
  params.set('crypto', asset)
  params.set('walletAddress', address)

  return `${baseUrl}?${params.toString()}`
}
