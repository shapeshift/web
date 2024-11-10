import type { PayloadAction } from '@reduxjs/toolkit'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { localAssetData } from 'lib/asset-service'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type { TradeInputBaseState } from '../common/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/createTradeInputBaseSlice'

interface TradeInputState extends TradeInputBaseState {
  slippagePreferencePercentage: string | undefined
}

const initialState: TradeInputState = {
  buyAsset: localAssetData[foxAssetId] ?? defaultAsset,
  sellAsset: localAssetData[ethAssetId] ?? defaultAsset,
  sellAssetAccountId: undefined,
  buyAssetAccountId: undefined,
  sellAmountCryptoPrecision: '0',
  isInputtingFiatSellAmount: false,
  manualReceiveAddress: undefined,
  manualReceiveAddressIsValidating: false,
  manualReceiveAddressIsValid: undefined,
  manualReceiveAddressIsEditing: false,
  slippagePreferencePercentage: undefined,
}

export const tradeInput = createTradeInputBaseSlice({
  name: 'tradeInput',
  initialState,
  extraReducers: {
    setSlippagePreferencePercentage: (
      state: TradeInputState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.slippagePreferencePercentage = action.payload
    },
  },
})
