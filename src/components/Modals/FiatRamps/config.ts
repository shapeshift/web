import type { AssetId } from '@keepkey/caip'
import { adapters, btcAssetId } from '@keepkey/caip'
import concat from 'lodash/concat'
import banxaLogo from 'assets/banxa.png'
import gemLogo from 'assets/gem-mark.png'
import junoPayLogo from 'assets/junoPay.svg'
import MtPelerinLogo from 'assets/mtpelerin.png'
import OnRamperLogo from 'assets/on-ramper.png'
import { logger } from 'lib/logger'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

import { createBanxaUrl, getBanxaAssets } from './fiatRampProviders/banxa'
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
import type { FiatRampAction, FiatRampAsset } from './FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'config'],
})

export const usdcAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const usdtAssetId: AssetId = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'

export interface SupportedFiatRampConfig {
  // key of translation jsons, will be used to show the provider name in the list
  label: string
  // key of translation jsons, will be used to show the provider info in the list
  info?: string
  // array of keys of translation jsons, will be used to show the tags in the list
  tags?: string[]
  logo: string
  isImplemented: boolean
  isActive: (featureFlags: FeatureFlags) => boolean
  getBuyAndSellList: () => Promise<[FiatRampAsset[], FiatRampAsset[]]>
  onSubmit: (action: FiatRampAction, asset: string, address: string) => void
  minimumSellThreshold?: number
  supportsBuy: boolean
  supportsSell: boolean
}

export const fiatRamps = ['Gem', 'Banxa', 'JunoPay', 'MtPelerin', 'OnRamper'] as const
export type FiatRamp = typeof fiatRamps[number]
export type SupportedFiatRamp = Record<FiatRamp, SupportedFiatRampConfig>

export const supportedFiatRamps: SupportedFiatRamp = {
  Gem: {
    label: 'fiatRamps.gem',
    logo: gemLogo,
    supportsBuy: true,
    supportsSell: true,
    getBuyAndSellList: async () => {
      const coinifyAssets = await fetchCoinifySupportedCurrencies()
      const wyreAssets = await fetchWyreSupportedCurrencies()
      const currencyList = concat(coinifyAssets, wyreAssets)
      const parsedBuyList = parseGemBuyAssets(currencyList)
      const parsedSellList = parseGemSellAssets(currencyList)
      return [parsedBuyList, parsedSellList]
    },
    onSubmit: (action, assetId: AssetId, address) => {
      try {
        const ticker = adapters.assetIdToGemTicker(assetId)
        const gemPartnerUrl = makeGemPartnerUrl(action, ticker, address)
        window.open(gemPartnerUrl, '_blank')?.focus()
      } catch (err) {
        moduleLogger.error(err, { fn: 'Gem onSubmit' }, 'Asset not supported by Gem')
      }
    },
    isImplemented: true,
    isActive: () => true,
    minimumSellThreshold: 5,
  },
  Banxa: {
    label: 'fiatRamps.banxa',
    logo: banxaLogo,
    isImplemented: true,
    isActive: () => true,
    minimumSellThreshold: 50,
    supportsBuy: true,
    supportsSell: true,
    getBuyAndSellList: async () => {
      const buyAssets = getBanxaAssets()
      const sellAssets = buyAssets.filter(a =>
        [btcAssetId, usdcAssetId, usdtAssetId].includes(a.assetId),
      )
      return [buyAssets, sellAssets]
    },
    onSubmit: (action: FiatRampAction, assetId: AssetId, address: string) => {
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
    label: 'fiatRamps.junoPay',
    tags: ['fiatRamps.usOnly'],
    logo: junoPayLogo,
    isImplemented: true,
    isActive: () => true,
    supportsBuy: true,
    supportsSell: false,
    getBuyAndSellList: async () => {
      const buyAssets = await getJunoPayAssets()
      return [buyAssets, []]
    },
    onSubmit: (action: FiatRampAction, assetId: AssetId, address: string) => {
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
    label: 'fiatRamps.mtPelerin',
    tags: ['fiatRamps.noKYC', 'fiatRamps.nonUS'],
    logo: MtPelerinLogo,
    isImplemented: true,
    isActive: () => true,
    supportsBuy: true,
    supportsSell: true,
    // https://developers.mtpelerin.com/service-information/pricing-and-limits#limits-2
    // 50 CHF is currently equivalent to 51.72 USD
    // note that Mt Pelerin has a minimum of 50 CHF, and our fiat balance is denoted in USD
    minimumSellThreshold: 55,
    getBuyAndSellList: async () => {
      const mtPelerinAssets = await getMtPelerinAssets()
      return [mtPelerinAssets, mtPelerinAssets]
    },
    onSubmit: (action: FiatRampAction, assetId: AssetId, address: string) => {
      try {
        const mtPelerinCheckoutUrl = createMtPelerinUrl(action, assetId, address)
        window.open(mtPelerinCheckoutUrl, '_blank')?.focus()
      } catch (err) {
        moduleLogger.error(err, { fn: 'MtPelerin onSubmit' }, 'Asset not supported by MtPelerin')
      }
    },
  },
  OnRamper: {
    label: 'fiatRamps.onRamper',
    tags: [],
    logo: OnRamperLogo,
    isImplemented: true,
    isActive: () => true,
    supportsBuy: true,
    supportsSell: true,
    minimumSellThreshold: 0,
    getBuyAndSellList: async () => {
      const onRamperAssets = await getOnRamperAssets()
      return [onRamperAssets, onRamperAssets]
    },
    onSubmit: (action: FiatRampAction, assetId: AssetId, address: string) => {
      try {
        const onRamperCheckoutUrl = createOnRamperUrl(
          action,
          assetId,
          address,
          window.location.href,
        )
        window.open(onRamperCheckoutUrl, '_blank')?.focus()
      } catch (err) {
        moduleLogger.error(err, { fn: 'OnRamper onSubmit' }, 'Asset not supported by OnRamper')
      }
    },
  },
}
