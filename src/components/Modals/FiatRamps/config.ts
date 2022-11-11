import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, btcAssetId } from '@shapeshiftoss/caip'
import concat from 'lodash/concat'
import banxaLogo from 'assets/banxa.png'
import gemLogo from 'assets/gem-mark.png'
import junoPayLogo from 'assets/junoPay.svg'
import MtPelerinLogo from 'assets/mtpelerin.png'
import OnRamperLogo from 'assets/on-ramper.png'
import { logger } from 'lib/logger'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

import { createBanxaUrl } from './fiatRampProviders/banxa'
import {
  fetchCoinifySupportedCurrencies,
  fetchWyreSupportedCurrencies,
  makeGemPartnerUrl,
  parseGemBuyAssets,
  parseGemSellAssets,
} from './fiatRampProviders/gem'
import { createJunoPayUrl, getJunoPayAssets } from './fiatRampProviders/junopay'
import { createMtPelerinUrl, getMtPelerinAssets } from './fiatRampProviders/mtpelerin'
import { createOnRamperUrl, getOnRamperAssets } from './fiatRampProviders/onramper'
import type { FiatRampAction } from './FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'config'],
})

export const usdcAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const usdtAssetId: AssetId = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'

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
  onSubmit: (action: FiatRampAction, asset: AssetId, address: string, language: string) => void
  minimumSellThreshold?: number
}

const fiatRamps = ['Gem', 'Banxa', 'JunoPay', 'MtPelerin', 'OnRamper'] as const
export type FiatRamp = typeof fiatRamps[number]
export type SupportedFiatRamp = Record<FiatRamp, SupportedFiatRampConfig>

export const supportedFiatRamps: SupportedFiatRamp = {
  Gem: {
    id: 'Gem',
    label: 'fiatRamps.gem',
    logo: gemLogo,
    order: 1,
    getBuyAndSellList: async () => {
      const coinifyAssets = await fetchCoinifySupportedCurrencies()
      const wyreAssets = await fetchWyreSupportedCurrencies()
      const currencyList = concat(coinifyAssets, wyreAssets)
      const buyAssetIds = parseGemBuyAssets(currencyList)
      const sellAssetIds = parseGemSellAssets(currencyList)
      return [buyAssetIds, sellAssetIds]
    },
    onSubmit: (action, assetId, address) => {
      try {
        const ticker = adapters.assetIdToGemTicker(assetId)
        const gemPartnerUrl = makeGemPartnerUrl(action, ticker, address)
        window.open(gemPartnerUrl, '_blank')?.focus()
      } catch (err) {
        moduleLogger.error(err, { fn: 'Gem onSubmit' }, 'Asset not supported by Gem')
      }
    },
    isActive: () => false,
    minimumSellThreshold: 5,
  },
  OnRamper: {
    id: 'OnRamper',
    label: 'fiatRamps.onRamper',
    tags: ['Aggregator'],
    logo: OnRamperLogo,
    isActive: () => true,
    minimumSellThreshold: 0,
    order: 2,
    getBuyAndSellList: async () => {
      const buyAndSellAssetIds = await getOnRamperAssets()
      return [buyAndSellAssetIds, buyAndSellAssetIds]
    },
    onSubmit: (action, assetId, address, language = 'en') => {
      try {
        const onRamperCheckoutUrl = createOnRamperUrl(
          action,
          assetId,
          address,
          window.location.href,
          language,
        )
        window.open(onRamperCheckoutUrl, '_blank')?.focus()
      } catch (err) {
        moduleLogger.error(err, { fn: 'OnRamper onSubmit' }, 'Asset not supported by OnRamper')
      }
    },
  },
  Banxa: {
    id: 'Banxa',
    label: 'fiatRamps.banxa',
    logo: banxaLogo,
    isActive: () => true,
    minimumSellThreshold: 50,
    order: 3,
    getBuyAndSellList: async () => {
      const buyAssetIds = adapters.getSupportedBanxaAssets().map(({ assetId }) => assetId)
      const sellAssetIds = [btcAssetId, usdcAssetId, usdtAssetId]
      return [buyAssetIds, sellAssetIds]
    },
    onSubmit: (action, assetId, address) => {
      try {
        const ticker = adapters.assetIdToBanxaTicker(assetId)
        if (!ticker) throw new Error('Asset not supported by Banxa')
        const banxaCheckoutUrl = createBanxaUrl(action, ticker, address)
        window.open(banxaCheckoutUrl, '_blank')?.focus()
      } catch (err) {
        moduleLogger.error(err, { fn: 'Banxa onSubmit' }, 'Asset not supported by Banxa')
      }
    },
  },
  JunoPay: {
    id: 'JunoPay',
    label: 'fiatRamps.junoPay',
    tags: ['fiatRamps.usOnly'],
    logo: junoPayLogo,
    order: 4,
    isActive: () => true,
    getBuyAndSellList: async () => {
      const buyAssetIds = await getJunoPayAssets()
      const sellAssetIds: AssetId[] = []
      return [buyAssetIds, sellAssetIds]
    },
    onSubmit: (action, assetId, address) => {
      try {
        const ticker = adapters.assetIdToJunoPayTicker(assetId)
        if (!ticker) throw new Error('Asset not supported by JunoPay')
        const junoPayCheckoutUrl = createJunoPayUrl(action, ticker, address)
        window.open(junoPayCheckoutUrl, '_blank')?.focus()
      } catch (err) {
        moduleLogger.error(err, { fn: 'JunoPay onSubmit' }, 'Asset not supported by JunoPay')
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
    onSubmit: (action, assetId, address, language = 'en') => {
      try {
        const mtPelerinCheckoutUrl = createMtPelerinUrl(action, assetId, address, language)
        window.open(mtPelerinCheckoutUrl, '_blank')?.focus()
      } catch (err) {
        moduleLogger.error(err, { fn: 'MtPelerin onSubmit' }, 'Asset not supported by MtPelerin')
      }
    },
  },
}
