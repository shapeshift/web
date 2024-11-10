import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { localAssetData } from 'lib/asset-service'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type { TradeInputBaseState } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'

type TradeInputState = TradeInputBaseState

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
  extraReducers: {},
})
