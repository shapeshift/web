import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import flatten from 'lodash/flatten'
import memoize from 'lodash/memoize'
import uniqBy from 'lodash/uniqBy'
import queryString from 'querystring'

import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

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

export const fetchCoinifySupportedCurrencies = memoize(async (): Promise<SupportedCurrency[]> => {
  try {
    const { data } = await axios.get(getConfig().REACT_APP_GEM_COINIFY_SUPPORTED_COINS)
    return data
  } catch (e: any) {
    console.error(e)
    return []
  }
})

export const fetchWyreSupportedCurrencies = memoize(async (): Promise<SupportedCurrency[]> => {
  try {
    const { data } = await axios.get(getConfig().REACT_APP_GEM_WYRE_SUPPORTED_COINS)
    return data
  } catch (e: any) {
    console.error(e)
    return []
  }
})

export const isBuyAsset = (currency: SupportedCurrency) =>
  currency.transaction_direction === TransactionDirection.BankToBlockchain ||
  currency.transaction_direction === TransactionDirection.CardToBlockchain

export const isSellAsset = (currency: SupportedCurrency) =>
  currency.transaction_direction === TransactionDirection.BlockchainToBank

export const parseGemSellAssets = memoize((assets: SupportedCurrency[]): FiatRampAsset[] =>
  parseGemAssets(
    'source',
    assets.filter(isSellAsset).map(asset => asset['source'].currencies),
  ),
)

export const parseGemBuyAssets = memoize((assets: SupportedCurrency[]): FiatRampAsset[] =>
  parseGemAssets(
    'destination',
    assets.filter(isBuyAsset).map(asset => asset['destination'].currencies),
  ),
)

const parseGemAssets = (
  key: 'destination' | 'source',
  filteredList: GemCurrency[][],
): FiatRampAsset[] => {
  const results = uniqBy(flatten(filteredList), 'gem_asset_id')
    .filter(asset => Boolean(adapters.gemAssetIdToCAIP19(asset.gem_asset_id)))
    .map(asset => {
      const assetId = adapters.gemAssetIdToCAIP19(asset.gem_asset_id) || ''
      const { ticker, name } = asset
      return {
        symbol: ticker,
        name,
        assetId,
        imageUrl: getGemAssetLogoUrl(asset),
      }
    })
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
    return `${GEM_URL}?${queryConfig}`
  },
  memoizeAllArgsResolver,
)

const ASSET_LOGO_BASE_URI = getConfig().REACT_APP_GEM_ASSET_LOGO

const getGemAssetLogoUrl = (asset: GemCurrency) => {
  return ASSET_LOGO_BASE_URI + asset.ticker.toLowerCase() + '.svg'
}
