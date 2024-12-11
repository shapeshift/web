import type { SliceCaseReducers } from '@reduxjs/toolkit'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { localAssetData } from 'lib/asset-service'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type { TradeInputBaseState } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'

type TradeInputState = TradeInputBaseState

const initialState: TradeInputState = {
  buyAsset: localAssetData[foxAssetId] ?? defaultAsset,
  sellAsset: localAssetData[ethAssetId] ?? defaultAsset,
  sellAccountId: undefined,
  buyAccountId: undefined,
  sellAmountCryptoPrecision: '0',
  isInputtingFiatSellAmount: false,
  manualReceiveAddress: undefined,
  isManualReceiveAddressValidating: false,
  isManualReceiveAddressValid: undefined,
  isManualReceiveAddressEditing: false,
  slippagePreferencePercentage: undefined,
}

export const tradeInput = createTradeInputBaseSlice({
  name: 'tradeInput',
  initialState,
  extraReducers: (_baseReducers: SliceCaseReducers<TradeInputState>) => ({
    // Add any reducers specific to tradeInput slice here that aren't shared with other slices
  }),
})
