import type { PayloadAction } from '@reduxjs/toolkit'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import type { Asset } from 'packages/types'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type { BaseReducers } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'

import type { RampQuote } from '@/components/Modals/FiatRamps/config'
import { FiatCurrencyTypeEnum } from '@/constants/FiatCurrencyTypeEnum'
import { getAssetService } from '@/lib/asset-service'
import type { FiatCurrencyItem } from '@/lib/fiatCurrencies/fiatCurrencies'
import { fiatCurrencyItemsByCode } from '@/lib/fiatCurrencies/fiatCurrencies'

export type TradeRampInputState = {
  buyFiatCurrency: FiatCurrencyItem
  sellFiatCurrency: FiatCurrencyItem
  slippagePreferencePercentage: string | undefined
  buyAsset: Asset
  sellAsset: Asset
  sellAccountId: AccountId | undefined
  buyAccountId: AccountId | undefined
  sellAmountCryptoPrecision: string
  sellCryptoAmount: string
  buyFiatAmount: string
  isInputtingFiatSellAmount: boolean
  manualReceiveAddress: string | undefined
  isManualReceiveAddressValidating: boolean
  isManualReceiveAddressEditing: boolean
  isManualReceiveAddressValid: boolean | undefined
  selectedSellAssetChainId: ChainId | 'All'
  selectedBuyAssetChainId: ChainId | 'All'
  selectedBuyFiatRampQuote: RampQuote | null
  selectedSellFiatRampQuote: RampQuote | null
}

const service = getAssetService()

const initialState: TradeRampInputState = {
  buyAsset: service.assetsById[btcAssetId] ?? defaultAsset,
  sellAsset: service.assetsById[ethAssetId] ?? defaultAsset,
  buyFiatCurrency: fiatCurrencyItemsByCode[FiatCurrencyTypeEnum.USD],
  sellFiatCurrency: fiatCurrencyItemsByCode[FiatCurrencyTypeEnum.USD],
  sellAccountId: undefined,
  buyAccountId: undefined,
  sellAmountCryptoPrecision: '',
  sellCryptoAmount: '',
  buyFiatAmount: '',
  isInputtingFiatSellAmount: false,
  manualReceiveAddress: undefined,
  isManualReceiveAddressValidating: false,
  isManualReceiveAddressValid: undefined,
  isManualReceiveAddressEditing: false,
  slippagePreferencePercentage: undefined,
  selectedSellAssetChainId: 'All',
  selectedBuyAssetChainId: 'All',
  selectedBuyFiatRampQuote: null,
  selectedSellFiatRampQuote: null,
}

export const tradeRampInput = createTradeInputBaseSlice({
  name: 'tradeRampInput',
  initialState,
  extraReducers: (_baseReducers: BaseReducers<TradeRampInputState>) => ({
    setBuyFiatAsset: (state: TradeRampInputState, action: PayloadAction<FiatCurrencyItem>) => {
      state.buyFiatCurrency = action.payload
    },
    setSellFiatAsset: (state: TradeRampInputState, action: PayloadAction<FiatCurrencyItem>) => {
      state.sellFiatCurrency = action.payload
    },
    setBuyFiatAmount: (state: TradeRampInputState, action: PayloadAction<string>) => {
      state.buyFiatAmount = action.payload
    },
    setSelectedBuyFiatRampQuote: (
      state: TradeRampInputState,
      action: PayloadAction<RampQuote | null>,
    ) => {
      state.selectedBuyFiatRampQuote = action.payload
    },
    setSelectedSellFiatRampQuote: (
      state: TradeRampInputState,
      action: PayloadAction<RampQuote | null>,
    ) => {
      state.selectedSellFiatRampQuote = action.payload
    },
  }),
  selectors: {
    selectBuyFiatCurrency: state => state.buyFiatCurrency,
    selectSellFiatCurrency: state => state.sellFiatCurrency,
    selectSellCryptoAmount: state => state.sellCryptoAmount,
    selectSelectedBuyFiatRampQuote: state => state.selectedBuyFiatRampQuote,
    selectSelectedSellFiatRampQuote: state => state.selectedSellFiatRampQuote,
  },
})
