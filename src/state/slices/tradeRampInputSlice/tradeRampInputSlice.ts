import type { PayloadAction } from '@reduxjs/toolkit'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import type { Asset } from 'packages/types/src/base'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type { BaseReducers } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'

import type { FiatCurrencyItem, RampQuote } from '@/components/Modals/FiatRamps/config'
import { localAssetData } from '@/lib/asset-service'
import type { TradeInputState } from '@/state/slices/tradeInputSlice/tradeInputSlice'

export type TradeRampInputState = {
  buyFiatCurrency: FiatCurrencyItem | undefined
  sellFiatCurrency: FiatCurrencyItem | undefined
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
  buyFiatCurrency: undefined,
  sellFiatCurrency: undefined,
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
    setSellAssetUtxoChangeAddress: (
      state: TradeInputState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.sellAssetUtxoChangeAddress = action.payload
    },
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
