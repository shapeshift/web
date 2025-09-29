import type { PayloadAction } from '@reduxjs/toolkit'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import type { Asset } from 'packages/types/src/base'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type { BaseReducers } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'

import type { RampQuote } from '@/components/Modals/FiatRamps/config'
import { FiatCurrencyTypeEnum } from '@/constants/FiatCurrencyTypeEnum'
import { localAssetData } from '@/lib/asset-service'
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
  sellFiatAmount: string
  isInputtingFiatSellAmount: boolean
  manualReceiveAddress: string | undefined
  isManualReceiveAddressValidating: boolean
  isManualReceiveAddressEditing: boolean
  isManualReceiveAddressValid: boolean | undefined
  selectedSellAssetChainId: ChainId | 'All'
  selectedBuyAssetChainId: ChainId | 'All'
  selectedFiatRampQuote: RampQuote | null
}

const initialState: TradeRampInputState = {
  buyAsset: localAssetData[btcAssetId] ?? defaultAsset,
  sellAsset: localAssetData[ethAssetId] ?? defaultAsset,
  buyFiatCurrency: fiatCurrencyItemsByCode[FiatCurrencyTypeEnum.USD],
  sellFiatCurrency: fiatCurrencyItemsByCode[FiatCurrencyTypeEnum.USD],
  sellAccountId: undefined,
  buyAccountId: undefined,
  sellAmountCryptoPrecision: '0',
  sellFiatAmount: '0',
  isInputtingFiatSellAmount: false,
  manualReceiveAddress: undefined,
  isManualReceiveAddressValidating: false,
  isManualReceiveAddressValid: undefined,
  isManualReceiveAddressEditing: false,
  slippagePreferencePercentage: undefined,
  selectedSellAssetChainId: 'All',
  selectedBuyAssetChainId: 'All',
  selectedFiatRampQuote: null,
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
    setSellFiatAmount: (state: TradeRampInputState, action: PayloadAction<string>) => {
      state.sellFiatAmount = action.payload
    },
    setSelectedFiatRampQuote: (
      state: TradeRampInputState,
      action: PayloadAction<RampQuote | null>,
    ) => {
      state.selectedFiatRampQuote = action.payload
    },
  }),
  selectors: {
    selectBuyFiatCurrency: state => state.buyFiatCurrency,
    selectSellFiatCurrency: state => state.sellFiatCurrency,
    selectSellFiatAmount: state => state.sellFiatAmount,
    selectSelectedFiatRampQuote: state => state.selectedFiatRampQuote,
  },
})
