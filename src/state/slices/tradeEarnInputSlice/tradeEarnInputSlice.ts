import type { PayloadAction } from '@reduxjs/toolkit'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type { BaseReducers } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'

export type TradeEarnInputState = {
  buyAsset: Asset
  sellAsset: Asset
  sellAccountId: AccountId | undefined
  buyAccountId: AccountId | undefined
  sellAmountCryptoPrecision: string
  isInputtingFiatSellAmount: boolean
  manualReceiveAddress: string | undefined
  isManualReceiveAddressValidating: boolean
  isManualReceiveAddressEditing: boolean
  isManualReceiveAddressValid: boolean | undefined
  selectedSellAssetChainId: ChainId | 'All'
  selectedBuyAssetChainId: ChainId | 'All'
  selectedYieldId: string | undefined
}

const initialState: TradeEarnInputState = {
  buyAsset: defaultAsset,
  sellAsset: defaultAsset,
  sellAccountId: undefined,
  buyAccountId: undefined,
  sellAmountCryptoPrecision: '0',
  isInputtingFiatSellAmount: false,
  manualReceiveAddress: undefined,
  isManualReceiveAddressValidating: false,
  isManualReceiveAddressValid: undefined,
  isManualReceiveAddressEditing: false,
  selectedSellAssetChainId: 'All',
  selectedBuyAssetChainId: 'All',
  selectedYieldId: undefined,
}

export const tradeEarnInput = createTradeInputBaseSlice({
  name: 'tradeEarnInput',
  initialState,
  extraReducers: (baseReducers: BaseReducers<TradeEarnInputState>) => ({
    setSelectedYieldId: (state: TradeEarnInputState, action: PayloadAction<string | undefined>) => {
      state.selectedYieldId = action.payload
    },
    setSellAssetWithYieldReset: (state: TradeEarnInputState, action: PayloadAction<Asset>) => {
      baseReducers.setSellAsset(state, action)
      state.selectedYieldId = undefined
      state.isInputtingFiatSellAmount = false
    },
  }),
  selectors: {
    selectSelectedYieldId: state => state.selectedYieldId,
  },
})
