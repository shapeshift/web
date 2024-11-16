import type { PayloadAction } from '@reduxjs/toolkit'
import { foxAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import { localAssetData } from 'lib/asset-service'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type { TradeInputBaseState } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { ExpiryOption, PriceDirection } from './constants'

export type LimitOrderInputState = {
  limitPriceDirection: PriceDirection
  limitPrice: Record<PriceDirection, string>
  expiry: ExpiryOption
} & TradeInputBaseState

const initialState: LimitOrderInputState = {
  buyAsset: localAssetData[foxAssetId] ?? defaultAsset,
  sellAsset: localAssetData[usdcAssetId] ?? defaultAsset,
  sellAccountId: undefined,
  buyAccountId: undefined,
  sellAmountCryptoPrecision: '0',
  isInputtingFiatSellAmount: false,
  manualReceiveAddress: undefined,
  isManualReceiveAddressValidating: false,
  isManualReceiveAddressValid: undefined,
  isManualReceiveAddressEditing: false,
  slippagePreferencePercentage: undefined,
  limitPriceDirection: PriceDirection.BuyAssetDenomination,
  limitPrice: {
    [PriceDirection.BuyAssetDenomination]: '0',
    [PriceDirection.SellAssetDenomination]: '0',
  },
  expiry: ExpiryOption.SevenDays,
}

export const limitOrderInput = createTradeInputBaseSlice({
  name: 'limitOrderInput',
  initialState,
  extraReducers: {
    setLimitPrice: (
      state: LimitOrderInputState,
      action: PayloadAction<Record<PriceDirection, string>>,
    ) => {
      state.limitPrice = action.payload
    },
    setLimitPriceDirection: (
      state: LimitOrderInputState,
      action: PayloadAction<PriceDirection>,
    ) => {
      state.limitPriceDirection = action.payload
    },
    setExpiry: (state: LimitOrderInputState, action: PayloadAction<ExpiryOption>) => {
      state.expiry = action.payload
    },
  },
})
