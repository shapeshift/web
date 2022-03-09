import axios from 'axios'
import { getConfig } from 'config'
import { concat, flatten, uniqBy } from 'lodash'
import { matchSorter } from 'match-sorter'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { GemCurrency, SupportedCurrency, TransactionDirection } from './FiatRamps'

const UNSUPPORTED_ASSETS = [
  'BCH',
  'BSV',
  'BNBBSC',
  'SOL',
  'DOGE',
  'LTC',
  'NANO',
  'DOT',
  'SOL',
  'XLM'
]

const ASSET_LOGO_BASE_URI =
  'https://gem-widgets-assets.s3-us-west-2.amazonaws.com/currencies/crypto/'

export const isSupportedBitcoinAsset = (ticker: string | undefined) =>
  Boolean(ticker && ticker === 'BTC')

export const getAssetLogoUrl = (asset: GemCurrency) => {
  return ASSET_LOGO_BASE_URI + asset.ticker.toLowerCase() + '.svg'
}

export const filterAssetsBySearchTerm = (search: string, assets: GemCurrency[]) => {
  if (!assets) return []

  return matchSorter(assets, search, { keys: ['name', 'ticker'] })
}

export const fetchCoinifySupportedCurrencies = async (): Promise<SupportedCurrency[]> => {
  try {
    const { data } = await axios.get(getConfig().REACT_APP_GEM_COINIFY_SUPPORTED_COINS)
    return data
  } catch (e: any) {
    console.error(e)
    return []
  }
}

export const fetchWyreSupportedCurrencies = async (): Promise<SupportedCurrency[]> => {
  try {
    const { data } = await axios.get(getConfig().REACT_APP_GEM_WYRE_SUPPORTED_COINS)
    return data
  } catch (e: any) {
    console.error(e)
    return []
  }
}

export const isBuyAsset = (currency: SupportedCurrency) =>
  currency.transaction_direction === TransactionDirection.BankToBlockchain ||
  currency.transaction_direction === TransactionDirection.CardToBlockchain

export const isSellAsset = (currency: SupportedCurrency) =>
  currency.transaction_direction === TransactionDirection.BlockchainToBank

export const filterAndMerge = (
  coinifyList: SupportedCurrency[],
  wyreList: SupportedCurrency[],
  key: 'destination' | 'source',
  filter: (currency: SupportedCurrency) => boolean,
  balances: any,
  btcAddress: any
): GemCurrency[] => {
  const filteredCoinifyList = coinifyList
    .filter(filter)
    .map(coinifyList => coinifyList[key].currencies)
  const filteredWyreList = wyreList.filter(filter).map(wyreList => wyreList[key].currencies)

  const results = uniqBy(flatten(concat(filteredCoinifyList, filteredWyreList)), 'gem_asset_id')
    .filter(asset => !UNSUPPORTED_ASSETS.includes(asset.ticker))
    .map(asset => {
      return {
        ...asset,
        disabled: isSupportedBitcoinAsset(asset?.ticker) && !btcAddress,
        cryptoBalance: bnOrZero(balances[asset?.ticker]?.crypto),
        fiatBalance: bnOrZero(balances[asset?.ticker]?.fiat)
      }
    })
    .sort((a, b) =>
      key === 'source' && (a.fiatBalance || b.fiatBalance)
        ? b.fiatBalance.minus(a.fiatBalance).toNumber()
        : a.name.localeCompare(b.name)
    )
  return results
}
