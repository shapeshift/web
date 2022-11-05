import { adapters } from '@keepkey/caip'
import axios from 'axios'
import { getConfig } from 'config'
import flatten from 'lodash/flatten'
import memoize from 'lodash/memoize'
import uniqBy from 'lodash/uniqBy'
import queryString from 'querystring'
import { logger } from 'lib/logger'

import type { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

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

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'gem'],
})

export const fetchCoinifySupportedCurrencies = memoize(async (): Promise<SupportedCurrency[]> => {
  moduleLogger.trace(
    { fn: 'fetchCoinifySupportedCurrencies' },
    'Getting Supporting Coins (Coinify)...',
  )
  try {
    const { data } = await axios.get(getConfig().REACT_APP_GEM_COINIFY_SUPPORTED_COINS)
    return data
  } catch (e: any) {
    moduleLogger.error(
      e,
      { fn: 'fetchCoinifySupportedCurrencies' },
      'Get Supported Coins (Coinify) Failed',
    )
    return []
  }
})

export const fetchWyreSupportedCurrencies = memoize(async (): Promise<SupportedCurrency[]> => {
  moduleLogger.trace({ fn: 'fetchWyreSupportedCurrencies' }, 'Getting Supporting Coins (Wyre)...')
  try {
    const { data } = await axios.get(getConfig().REACT_APP_GEM_WYRE_SUPPORTED_COINS)
    return data
  } catch (e: any) {
    moduleLogger.error(
      e,
      { fn: 'fetchWyreSupportedCurrencies' },
      'Get Supported Coins (Wyre) Failed',
    )
    return []
  }
})

export const isBuyAsset = (currency: SupportedCurrency) =>
  currency.transaction_direction === TransactionDirection.BankToBlockchain ||
  currency.transaction_direction === TransactionDirection.CardToBlockchain

export const isSellAsset = (currency: SupportedCurrency) =>
  currency.transaction_direction === TransactionDirection.BlockchainToBank

export const parseGemSellAssets = memoize((assets: SupportedCurrency[]): FiatRampAsset[] =>
  parseGemAssets(assets.filter(isSellAsset).map(asset => asset['source'].currencies)),
)

export const parseGemBuyAssets = memoize((assets: SupportedCurrency[]): FiatRampAsset[] =>
  parseGemAssets(assets.filter(isBuyAsset).map(asset => asset['destination'].currencies)),
)

const parseGemAssets = (filteredList: GemCurrency[][]): FiatRampAsset[] => {
  const results = uniqBy(flatten(filteredList), 'gem_asset_id')
    .filter(asset => Boolean(adapters.gemTickerToAssetId(asset.gem_asset_id)))
    .map(asset => {
      const assetId = adapters.gemTickerToAssetId(asset.gem_asset_id) || ''
      const { ticker, name } = asset
      return {
        symbol: ticker,
        name,
        assetId,
        imageUrl: getGemAssetLogoUrl(asset),
      }
    })

  moduleLogger.trace({ fn: 'parseGemAssets', filteredList, results }, 'Gem Assets Transformed')
  return results
}

const memoizeAllArgsResolver = (...args: any) => JSON.stringify(args)

export const makeGemPartnerUrl = memoize(
  (intent: FiatRampAction, selectedAssetTicker: string | undefined, address: string) => {
    if (!selectedAssetTicker) return

    const GEM_URL = 'https://onramp.gem.co'
    const partnerName = 'ShapeShift'
    const environment = getConfig().REACT_APP_GEM_ENV
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
    moduleLogger.trace({ fn: 'makeGemPartnerUrl', url }, 'Gem Partner URL')
    return url
  },
  memoizeAllArgsResolver,
)

const ASSET_LOGO_BASE_URI = getConfig().REACT_APP_GEM_ASSET_LOGO

const getGemAssetLogoUrl = (asset: GemCurrency) => {
  return ASSET_LOGO_BASE_URI + asset.ticker.toLowerCase() + '.svg'
}
