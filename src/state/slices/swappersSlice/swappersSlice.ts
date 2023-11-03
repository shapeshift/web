import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import { localAssetData } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import { MultiHopExecutionStatus } from './types'

export type SwappersState = {
  buyAsset: Asset
  sellAsset: Asset
  sellAssetAccountId: AccountId | undefined
  buyAssetAccountId: AccountId | undefined
  sellAmountCryptoPrecision: string
  tradeExecutionStatus: MultiHopExecutionStatus
  willDonate: boolean
  manualReceiveAddress: string | undefined
  manualReceiveAddressIsValidating: boolean
  slippagePreferencePercentage: string | undefined
}

// Define the initial state:
const initialState: SwappersState = {
  buyAsset: localAssetData[foxAssetId] ?? defaultAsset,
  sellAsset: localAssetData[ethAssetId] ?? defaultAsset,
  sellAssetAccountId: undefined,
  buyAssetAccountId: undefined,
  sellAmountCryptoPrecision: '0',
  tradeExecutionStatus: MultiHopExecutionStatus.Previewing,
  willDonate: true,
  manualReceiveAddress: undefined,
  manualReceiveAddressIsValidating: false,
  slippagePreferencePercentage: undefined,
}

// Create the slice:
export const swappers = createSlice({
  name: 'swappers',
  initialState,
  reducers: {
    clear: () => initialState,
    setBuyAsset: (state, action: PayloadAction<Asset>) => {
      const asset = action.payload

      // Handle the user selecting the same asset for both buy and sell
      const isSameAsSellAsset = asset.assetId === state.sellAsset.assetId
      if (isSameAsSellAsset) state.sellAsset = state.buyAsset

      state.buyAsset = asset

      const buyAssetChainId = state.buyAsset.chainId
      const buyAssetAccountChainId = state.buyAssetAccountId
        ? fromAccountId(state.buyAssetAccountId).chainId
        : undefined

      // reset user selection on mismatch
      if (state.buyAssetAccountId && buyAssetChainId !== buyAssetAccountChainId)
        state.buyAssetAccountId = undefined
    },
    setSellAsset: (state, action: PayloadAction<Asset>) => {
      const asset = action.payload

      // Handle the user selecting the same asset for both buy and sell
      const isSameAsBuyAsset = asset.assetId === state.buyAsset.assetId
      if (isSameAsBuyAsset) state.buyAsset = state.sellAsset

      state.sellAsset = action.payload

      const sellAssetChainId = state.sellAsset.chainId
      const sellAssetAccountChainId = state.sellAssetAccountId
        ? fromAccountId(state.sellAssetAccountId).chainId
        : undefined

      // reset user selection on mismatch
      if (state.sellAssetAccountId && sellAssetChainId !== sellAssetAccountChainId)
        state.sellAssetAccountId = undefined
    },
    setSellAssetAccountId: (state, action: PayloadAction<AccountId | undefined>) => {
      state.sellAssetAccountId = action.payload
    },
    setBuyAssetAccountId: (state, action: PayloadAction<AccountId | undefined>) => {
      state.buyAssetAccountId = action.payload
    },
    setSellAmountCryptoPrecision: (state, action: PayloadAction<string>) => {
      // dedupe 0, 0., 0.0, 0.00 etc
      state.sellAmountCryptoPrecision = bnOrZero(action.payload).toString()
    },
    incrementTradeExecutionState: state => {
      if (state.tradeExecutionStatus === MultiHopExecutionStatus.TradeComplete) return
      state.tradeExecutionStatus += 1 as MultiHopExecutionStatus
    },
    switchAssets: state => {
      const buyAsset = state.sellAsset
      state.sellAsset = state.buyAsset
      state.buyAsset = buyAsset
    },
    toggleWillDonate: state => {
      state.willDonate = !state.willDonate
    },
    setManualReceiveAddress: (state, action: PayloadAction<string | undefined>) => {
      state.manualReceiveAddress = action.payload
    },
    setManualReceiveAddressIsValidating: (state, action: PayloadAction<boolean>) => {
      state.manualReceiveAddressIsValidating = action.payload
    },
    setSlippagePreferencePercentage: (state, action: PayloadAction<string | undefined>) => {
      state.slippagePreferencePercentage = action.payload
    },
  },
})
