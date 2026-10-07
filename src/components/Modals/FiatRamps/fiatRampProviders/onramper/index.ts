import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'

import { FiatRampAction } from '../../FiatRampsCommon'
import type { CreateUrlProps } from '../../types'
import type { OnRamperGatewaysResponse } from './types'
import {
  findAssetIdByOnramperCrypto,
  findOnramperTokenIdByAssetId,
  getSupportedOnramperCurrencies,
} from './utils'

import { getConfig } from '@/config'

export const getOnRamperAssets = async (): Promise<AssetId[]> => {
  const data = await getSupportedOnramperCurrencies()
  if (!data) return []
  return convertOnRamperDataToFiatRampAsset(data)
}

const convertOnRamperDataToFiatRampAsset = (response: OnRamperGatewaysResponse): AssetId[] => {
  return Array.from(
    new Set(
      response.message.crypto
        .map(currency => findAssetIdByOnramperCrypto(currency))
        .filter((assetId): assetId is AssetId => Boolean(assetId)),
    ),
  )
}

export const createOnRamperUrl = async ({
  action,
  assetId,
  address,
  fiatCurrency,
  fiatAmount,
  amountCryptoPrecision,
  options,
}: CreateUrlProps): Promise<string> => {
  const baseURL = getConfig().VITE_ONRAMPER_SIGNING_URL
  if (!baseURL) throw new Error('Onramper checkout service is not configured')
  const currencies = await getSupportedOnramperCurrencies()
  if (!currencies) throw new Error('Onramper currencies unavailable')
  const crypto =
    adapters.assetIdToOnRamperTokenList(assetId)?.[0] ??
    findOnramperTokenIdByAssetId(assetId, currencies)
  if (!crypto) throw new Error('Asset not supported by Onramper')
  const client = axios.create({ baseURL, timeout: 10000 })
  const { data: intent } = await client.post<{ id: string; token: string }>('/onramper/intents', {
    crypto,
    address,
    fiat: fiatCurrency.toUpperCase(),
    action,
    amount: action === FiatRampAction.Sell ? amountCryptoPrecision : fiatAmount,
    language: options.language,
    theme: options.mode,
    redirectUrl: options.currentUrl,
  })
  const { data } = await client.post<{ url: string }>(
    `/onramper/intents/${encodeURIComponent(intent.id)}/checkout`,
    { token: intent.token },
  )
  const url = new URL(data.url)
  const expected = new URL(getConfig().VITE_ONRAMPER_WIDGET_URL)
  if (
    url.origin !== expected.origin ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/'
  )
    throw new Error('Invalid checkout URL')
  return url.href
}
