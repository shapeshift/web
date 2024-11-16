import type { PayloadAction } from '@reduxjs/toolkit'
import { foxAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import { localAssetData } from 'lib/asset-service'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type { TradeInputBaseState } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { ExpiryOption, PriceDirection } from './constants'

export type LimitOrderInputState = {
  limitPriceDirection: PriceDirection
  limitPrice: string
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
  limitPrice: '0',
  expiry: ExpiryOption.SevenDays,
}

export const limitOrderInput = createTradeInputBaseSlice({
  name: 'limitOrderInput',
  initialState,
  extraReducers: {
    // Sets the limitPrice based on a limit price denominated in the buy asset
    setLimitPriceBuyAssetDenomination: (
      state: LimitOrderInputState,
      action: PayloadAction<string>,
    ) => {
      state.limitPrice =
        state.limitPriceDirection === PriceDirection.BuyAssetDenomination
          ? action.payload
          : bn(1).div(action.payload).toFixed()
    },
    setLimitPrice: (state: LimitOrderInputState, action: PayloadAction<string>) => {
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
