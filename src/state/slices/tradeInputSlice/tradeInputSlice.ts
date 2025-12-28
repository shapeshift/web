import type { PayloadAction } from '@reduxjs/toolkit'
import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type {
  BaseReducers,
  TradeInputBaseState,
} from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'

import { getAssetService } from '@/lib/asset-service'

const localAssetData = getAssetService().assetsById

export type TradeInputState = {
  slippagePreferencePercentage: string | undefined
  sellAssetUtxoChangeAddress: string | undefined
} & TradeInputBaseState

const initialState: TradeInputState = {
  buyAsset: localAssetData[btcAssetId] ?? defaultAsset,
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
  sellAssetUtxoChangeAddress: undefined,
  selectedSellAssetChainId: 'All',
  selectedBuyAssetChainId: 'All',
}

export const tradeInput = createTradeInputBaseSlice({
  name: 'tradeInput',
  initialState,
  // Add any reducers specific to tradeInput slice here that aren't shared with other slices
  extraReducers: (_baseReducers: BaseReducers<TradeInputState>) => ({
    setSlippagePreferencePercentage: (
      state: TradeInputState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.slippagePreferencePercentage = action.payload
    },
    setSellAssetUtxoChangeAddress: (
      state: TradeInputState,
      action: PayloadAction<string | undefined>,
    ) => {
      state.sellAssetUtxoChangeAddress = action.payload
    },
  }),
})
