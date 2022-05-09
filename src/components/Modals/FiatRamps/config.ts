import concat from 'lodash/concat'
import gemlogo from 'assets/gem-mark.png'
import onjunologo from 'assets/onjuno.png'

import {
  fetchCoinifySupportedCurrencies,
  fetchWyreSupportedCurrencies,
  makeGemPartnerUrl,
  parseGemBuyAssets,
  parseGemSellAssets,
} from './fiatRampProviders/gem'
import { FiatRampAction, FiatRampAsset } from './FiatRampsCommon'

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
}

export enum FiatRamp {
  Gem = 'Gem',
  OnJuno = 'OnJuno',
}

export type SupportedFiatRamp = Record<FiatRamp, SupportedFiatRampConfig>
export const supportedFiatRamps: SupportedFiatRamp = {
  [FiatRamp.Gem]: {
    label: 'fiatRamps.gem',
    info: 'fiatRamps.gemMessage',
    logo: gemlogo,
    getBuyAndSellList: async () => {
      const coinifyAssets = await fetchCoinifySupportedCurrencies()
      const wyreAssets = await fetchWyreSupportedCurrencies()
      const currencyList = concat(coinifyAssets, wyreAssets)
      const parsedBuyList = parseGemBuyAssets(currencyList)
      const parsedSellList = parseGemSellAssets(currencyList)
      return [parsedBuyList, parsedSellList]
    },
    onSubmit: (action, asset, address) => {
      const gemPartnerUrl = makeGemPartnerUrl(action, asset, address)
      window.open(gemPartnerUrl, '_blank')?.focus()
    },
    isImplemented: true,
    minimumSellThreshold: 5,
  },
  [FiatRamp.OnJuno]: {
    label: 'fiatRamps.onJuno',
    logo: onjunologo,
    isImplemented: false,
    getBuyAndSellList: async () => [[], []],
    onSubmit: () => {},
  },
}
