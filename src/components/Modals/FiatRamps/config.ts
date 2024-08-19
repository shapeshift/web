import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, btcAssetId, fromAssetId, gnosisChainId } from '@shapeshiftoss/caip'
import banxaLogo from 'assets/banxa.png'
import CoinbaseLogo from 'assets/coinbase-logo.svg'
import MtPelerinLogo from 'assets/mtpelerin.png'
import OnRamperLogo from 'assets/onramper-logo.svg'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

import type commonFiatCurrencyList from './FiatCurrencyList.json'
import { createBanxaUrl, getSupportedBanxaFiatCurrencies } from './fiatRampProviders/banxa'
import {
  createCoinbaseUrl,
  getCoinbaseSupportedAssets,
  getSupportedCoinbaseFiatCurrencies,
} from './fiatRampProviders/coinbase'
import {
  createMtPelerinUrl,
  getMtPelerinAssets,
  getMtPelerinFiatCurrencies,
} from './fiatRampProviders/mtpelerin'
import {
  createOnRamperUrl,
  getOnRamperAssets,
  getSupportedOnRamperFiatCurrencies,
} from './fiatRampProviders/onramper'
import type { CreateUrlProps } from './types'

export const usdcAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const usdtAssetId: AssetId = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'

export type FiatCurrencyItem = {
  symbol: string
  name: string
  symbol_native?: string
  decimal_digits?: number
  rounding?: number
  code: string
  name_plural?: string
}

export type CommonFiatCurrencies = keyof typeof commonFiatCurrencyList

export interface SupportedFiatRampConfig {
  id: FiatRamp
  // key of translation jsons, will be used to show the provider name in the list
  label: string
  // key of translation jsons, will be used to show the provider info in the list
  info?: string
  // array of keys of translation jsons, will be used to show the tags in the list
  tags?: string[]
  logo: string
  // manul sort of the ramps
  order: number
  isActive: (featureFlags: FeatureFlags) => boolean
  getBuyAndSellList: () => Promise<[AssetId[], AssetId[]]>
  getSupportedFiatList: () => CommonFiatCurrencies[]
  onSubmit: (args: CreateUrlProps) => string | undefined
  minimumSellThreshold?: number
}

const fiatRamps = ['Banxa', 'MtPelerin', 'OnRamper', 'Coinbase'] as const
export type FiatRamp = (typeof fiatRamps)[number]
export type SupportedFiatRamp = Record<FiatRamp, SupportedFiatRampConfig>

export const supportedFiatRamps: SupportedFiatRamp = {
  Coinbase: {
    id: 'Coinbase',
    label: 'fiatRamps.coinbase',
    logo: CoinbaseLogo,
    order: 3,
    getBuyAndSellList: () => {
      const buyList = getCoinbaseSupportedAssets().buy
      const sellList = getCoinbaseSupportedAssets().sell
      return Promise.resolve([buyList, sellList])
    },
    getSupportedFiatList: () => getSupportedCoinbaseFiatCurrencies(),
    onSubmit: props => {
      return createCoinbaseUrl(props)
    },
    isActive: () => true,
    minimumSellThreshold: 0,
  },
  OnRamper: {
    id: 'OnRamper',
    label: 'fiatRamps.onRamper',
    tags: ['Aggregator'],
    logo: OnRamperLogo,
    isActive: () => true,
    minimumSellThreshold: 0,
    order: 3,
    getBuyAndSellList: async () => {
      const buyAndSellAssetIds = await getOnRamperAssets()
      // Gnosis network is listed in supported assets, but is not currently working (pending support ticket response)
      const filteredBuyAndSellAssetIds = buyAndSellAssetIds.filter(
        assetId => fromAssetId(assetId).chainId !== gnosisChainId,
      )
      return [filteredBuyAndSellAssetIds, filteredBuyAndSellAssetIds]
    },
    getSupportedFiatList: () => getSupportedOnRamperFiatCurrencies(),
    onSubmit: props => {
      try {
        const onRamperCheckoutUrl = createOnRamperUrl(props)
        return onRamperCheckoutUrl
      } catch (err) {
        console.error(err)
      }
    },
  },
  Banxa: {
    id: 'Banxa',
    label: 'fiatRamps.banxa',
    logo: banxaLogo,
    isActive: () => true,
    minimumSellThreshold: 50,
    order: 2,
    getBuyAndSellList: () => {
      const buyAssetIds = adapters.getSupportedBanxaAssets().map(({ assetId }) => assetId)
      const sellAssetIds = [btcAssetId, usdcAssetId, usdtAssetId]
      return Promise.resolve([buyAssetIds, sellAssetIds])
    },
    getSupportedFiatList: () => getSupportedBanxaFiatCurrencies(),
    onSubmit: props => {
      try {
        const banxaCheckoutUrl = createBanxaUrl(props)
        return banxaCheckoutUrl
      } catch (err) {
        console.error(err)
      }
    },
  },
  MtPelerin: {
    id: 'MtPelerin',
    label: 'fiatRamps.mtPelerin',
    tags: ['fiatRamps.noKYC', 'fiatRamps.nonUS'],
    logo: MtPelerinLogo,
    order: 5,
    isActive: () => true,
    // https://developers.mtpelerin.com/service-information/pricing-and-limits#limits-2
    // 50 CHF is currently equivalent to 51.72 USD
    // note that Mt Pelerin has a minimum of 50 CHF, and our fiat balance is denoted in USD
    minimumSellThreshold: 55,
    getBuyAndSellList: async () => {
      const buyAndSellAssetIds = await getMtPelerinAssets()
      return [buyAndSellAssetIds, buyAndSellAssetIds]
    },
    getSupportedFiatList: () => getMtPelerinFiatCurrencies(),
    onSubmit: props => {
      try {
        const mtPelerinCheckoutUrl = createMtPelerinUrl(props)
        return mtPelerinCheckoutUrl
      } catch (err) {
        console.error(err)
      }
    },
  },
}
