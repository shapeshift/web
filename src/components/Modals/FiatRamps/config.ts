import { generateOnRampURL } from '@coinbase/cbpay-js'
import { adapters, AssetId, btcAssetId } from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import concat from 'lodash/concat'
import banxaLogo from 'assets/banxa.png'
import coinbaseLogo from 'assets/coinbase-pay/cb-pay-icon.png'
import gemLogo from 'assets/gem-mark.png'
import { logger } from 'lib/logger'

import { createBanxaUrl, getBanxaAssets } from './fiatRampProviders/banxa'
import { getCoinbasePayAssets } from './fiatRampProviders/coinbase-pay'
import {
  fetchCoinifySupportedCurrencies,
  fetchWyreSupportedCurrencies,
  makeGemPartnerUrl,
  parseGemBuyAssets,
  parseGemSellAssets,
} from './fiatRampProviders/gem'
import { FiatRampAction, FiatRampAsset } from './FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'config'],
})

export interface SupportedFiatRampConfig {
  // key of translation jsons, will be used to show the provider name in the list
  label: string
  // key of translation jsons, will be used to show the provider info in the list
  info?: string
  logo: string
  isImplemented: boolean
  getBuyAndSellList: () => Promise<[FiatRampAsset[], FiatRampAsset[]]>
  onSubmit: (action: FiatRampAction, asset: string, address: string) => void
  minimumSellThreshold?: number
  supportsBuy: boolean
  supportsSell: boolean
}

export type FiatRamp = 'Gem' | 'Banxa' | 'CoinbasePay'

export type SupportedFiatRamp = Record<FiatRamp, SupportedFiatRampConfig>
export const supportedFiatRamps: SupportedFiatRamp = {
  Gem: {
    label: 'fiatRamps.gem',
    info: 'fiatRamps.gemMessage',
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
    minimumSellThreshold: 5,
  },
  Banxa: {
    label: 'fiatRamps.banxa',
    info: 'fiatRamps.banxaMessage',
    logo: banxaLogo,
    isImplemented: true,
    minimumSellThreshold: 50,
    supportsBuy: true,
    supportsSell: true,
    getBuyAndSellList: async () => {
      const buyAssets = getBanxaAssets()
      /**
       * https://discord.com/channels/554694662431178782/972197500305948803/973110904382169118
       * banxa only supports btc sells for now
       */
      const sellAssets = buyAssets.filter(a => a.assetId === btcAssetId)
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
  CoinbasePay: {
    label: 'fiatRamps.coinbasePay',
    info: 'fiatRamps.coinbasePayMessage',
    logo: coinbaseLogo,
    isImplemented: getConfig().REACT_APP_FEATURE_COINBASE_RAMP,
    supportsBuy: true,
    supportsSell: false,
    getBuyAndSellList: async () => {
      const buyAssets = await getCoinbasePayAssets()
      return [buyAssets, []]
    },
    onSubmit: (_, assetId: AssetId, address: string) => {
      try {
        const ticker = adapters.assetIdToCoinbaseTicker(assetId)
        if (!ticker) throw new Error('Asset not supported by Coinbase')
        const coinbasePayUrl = generateOnRampURL({
          appId: getConfig().REACT_APP_COINBASE_PAY_APP_ID,
          destinationWallets: [{ address, assets: [ticker] }],
        })
        window.open(coinbasePayUrl, '_blank')?.focus()
      } catch (err) {
        moduleLogger.error(
          err,
          { fn: 'CoinbasePay onSubmit' },
          'Asset not supported by Coinbase Pay',
        )
      }
    },
  },
}
