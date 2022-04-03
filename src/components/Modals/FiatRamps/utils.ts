import { adapters, CAIP19 } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { concat, flatten, uniqBy } from 'lodash'
import memoize from 'lodash/memoize'
import { matchSorter } from 'match-sorter'
import queryString from 'querystring'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { FiatRampAction, GemCurrency, SupportedCurrency, TransactionDirection } from './FiatRamps'

const ASSET_LOGO_BASE_URI = getConfig().REACT_APP_GEM_ASSET_LOGO

type MixedPortfolioAssetBalances = {
  [k: CAIP19]: {
    crypto: string
    fiat: string
  }
}

export const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

export const isSupportedBitcoinAsset = (assetId: string | undefined) =>
  Boolean(assetId === 'bip122:000000000019d6689c085ae165831e93/slip44:0')

export const getAssetLogoUrl = (asset: GemCurrency) => {
  return ASSET_LOGO_BASE_URI + asset.ticker.toLowerCase() + '.svg'
}

export const filterAssetsBySearchTerm = (search: string, assets: GemCurrency[]) => {
  if (!assets) return []

  return matchSorter(assets, search, { keys: ['name', 'assetId'] })
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

export const parseGemSellAssets = memoize(
  (
    walletSupportsBTC: boolean,
    coinifyAssets: SupportedCurrency[],
    wyreAssets: SupportedCurrency[],
    balances: MixedPortfolioAssetBalances
  ): GemCurrency[] =>
    parseGemAssets(
      'source',
      walletSupportsBTC,
      coinifyAssets.filter(isSellAsset).map(coinifyList => coinifyList['source'].currencies),
      wyreAssets.filter(isSellAsset).map(wyreList => wyreList['source'].currencies),
      balances
    )
)

export const parseGemBuyAssets = memoize(
  (
    walletSupportsBTC: boolean,
    coinifyAssets: SupportedCurrency[],
    wyreAssets: SupportedCurrency[],
    balances: MixedPortfolioAssetBalances
  ): GemCurrency[] =>
    parseGemAssets(
      'destination',
      walletSupportsBTC,
      coinifyAssets.filter(isBuyAsset).map(coinifyList => coinifyList['destination'].currencies),
      wyreAssets.filter(isBuyAsset).map(wyreList => wyreList['destination'].currencies),
      balances
    )
)

const parseGemAssets = (
  key: 'destination' | 'source',
  walletSupportsBTC: boolean,
  filteredCoinifyList: GemCurrency[][],
  filteredWyreList: GemCurrency[][],
  balances: MixedPortfolioAssetBalances
): GemCurrency[] => {
  const results = uniqBy(flatten(concat(filteredCoinifyList, filteredWyreList)), 'gem_asset_id')
    .filter(asset => Boolean(adapters.gemAssetIdToCAIP19(asset.gem_asset_id)))
    .map(asset => {
      const assetId = adapters.gemAssetIdToCAIP19(asset.gem_asset_id) || ''
      return {
        ...asset,
        assetId,
        disabled: isSupportedBitcoinAsset(assetId) && !walletSupportsBTC,
        cryptoBalance: bnOrZero(balances?.[assetId]?.crypto),
        fiatBalance: bnOrZero(balances?.[assetId]?.fiat)
      }
    })
    .sort((a, b) =>
      key === 'source' && (a.fiatBalance.gt(0) || b.fiatBalance.gt(0))
        ? b.fiatBalance.minus(a.fiatBalance).toNumber()
        : a.name.localeCompare(b.name)
    )
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
      apiKey
    }
    const queryConfig = queryString.stringify({
      ...onrampConfig,
      intent,
      wallets: JSON.stringify([{ address, asset: selectedAssetTicker }])
    })
    return `${GEM_URL}?${queryConfig}`
  },
  memoizeAllArgsResolver
)
