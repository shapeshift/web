import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import flatten from 'lodash/flatten'
import memoize from 'lodash/memoize'
import uniqBy from 'lodash/uniqBy'
import queryString from 'querystring'

import type { CommonFiatCurrencies } from '../config'
import type { CreateUrlProps } from '../types'

enum TransactionDirection {
  BankToBlockchain = 'bank_blockchain',
  CardToBlockchain = 'card_blockchain',
  BlockchainToBank = 'blockchain_bank',
}

// Non-exhaustive typings. We do not want to keep this a 1/1 mapping to an external API
// There could be breaking changes with other fields and that's fine, these are the only ones we need
export type GemCurrency = {
  gem_asset_id: string
  name: string
  ticker: string
  assetId: string
  disabled?: boolean
}

export type SupportedCurrency = {
  destination: {
    currencies: GemCurrency[]
  }
  source: {
    currencies: GemCurrency[]
  }
  transaction_direction: TransactionDirection
}

export const getSupportedGemFiatCurrencies = (): CommonFiatCurrencies[] => {
  return [
    'USD',
    'AUD',
    'HKD',
    'MXN',
    'BRL',
    'GBP',
    'EUR',
    'CAD',
    'ARS',
    'CHF',
    'CLP',
    'COP',
    'CZK',
    'DKK',
    'INR',
    'ISK',
    'MYR',
    'NOK',
    'PHP',
    'PLN',
    'SEK',
    'TRY',
    'ILS',
    'SGD',
    'THB',
    'VND',
    'JPY',
    'KRW',
    'ZAR',
    'NZD',
    'AED',
    'RON',
    'HUF',
    'BGN',
    'IDR',
    'HRK',
    'PEN',
    'KES',
    'TWD',
  ]
}

export const fetchCoinifySupportedCurrencies = memoize(async (): Promise<SupportedCurrency[]> => {
  try {
    const { data } = await axios.get(getConfig().REACT_APP_GEM_COINIFY_SUPPORTED_COINS)
    return data
  } catch (e) {
    console.error(e)
    return []
  }
})

export const fetchWyreSupportedCurrencies = memoize(async (): Promise<SupportedCurrency[]> => {
  try {
    const { data } = await axios.get(getConfig().REACT_APP_GEM_WYRE_SUPPORTED_COINS)
    return data
  } catch (e) {
    console.error(e)
    return []
  }
})

export const isBuyAsset = (currency: SupportedCurrency) =>
  currency.transaction_direction === TransactionDirection.BankToBlockchain ||
  currency.transaction_direction === TransactionDirection.CardToBlockchain

export const isSellAsset = (currency: SupportedCurrency) =>
  currency.transaction_direction === TransactionDirection.BlockchainToBank

export const parseGemSellAssets = memoize((assets: SupportedCurrency[]): AssetId[] =>
  parseGemAssets(assets.filter(isSellAsset).map(asset => asset['source'].currencies)),
)

export const parseGemBuyAssets = memoize((assets: SupportedCurrency[]): AssetId[] =>
  parseGemAssets(assets.filter(isBuyAsset).map(asset => asset['destination'].currencies)),
)

const parseGemAssets = (filteredList: GemCurrency[][]): AssetId[] => {
  const results = uniqBy(flatten(filteredList), 'gem_asset_id')
    .filter(asset => Boolean(adapters.gemTickerToAssetId(asset.gem_asset_id)))
    .map(({ gem_asset_id }) => adapters.gemTickerToAssetId(gem_asset_id))
    .filter((assetId): assetId is AssetId => Boolean(assetId))

  return results
}

const memoizeAllArgsResolver = (...args: any) => JSON.stringify(args)

export const makeGemPartnerUrl = memoize(({ action: intent, assetId, address }: CreateUrlProps) => {
  if (!assetId) return
  const selectedAssetTicker = adapters.assetIdToGemTicker(assetId)
  if (!selectedAssetTicker) return
  const GEM_URL = 'https://onramp.gem.co'
  const partnerName = 'ShapeShift'
  const environment = getConfig().REACT_APP_GEM_ENV
  // TODO(0xdef1cafe): this doesn't resolve to anything
  const partnerIconUrl =
    'https://portis-prod.s3.amazonaws.com/assets/dapps-logo/191330a6-d761-4312-9fa5-7f0024483302.png'
  const apiKey = getConfig().REACT_APP_GEM_API_KEY
  const onrampConfig = {
    partnerName,
    environment,
    partnerIconUrl,
    apiKey,
  }
  const queryConfig = queryString.stringify({
    ...onrampConfig,
    intent,
    wallets: JSON.stringify([{ address, asset: selectedAssetTicker }]),
  })

  const url = `${GEM_URL}?${queryConfig}`
  return url
}, memoizeAllArgsResolver)
