import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { localAssetData } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { defaultAsset } from '../assetsSlice/assetsSlice'

export type TradeInputState = {
  buyAsset: Asset
  sellAsset: Asset
  sellAssetAccountId: AccountId | undefined
  buyAssetAccountId: AccountId | undefined
  sellAmountCryptoPrecision: string
  isInputtingFiatSellAmount: boolean
  manualReceiveAddress: string | undefined
  manualReceiveAddressIsValidating: boolean
  manualReceiveAddressIsEditing: boolean
  manualReceiveAddressIsValid: boolean | undefined
  slippagePreferencePercentage: string | undefined
}

// Define the initial state:
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

// Create the slice:
export const tradeInput = createSlice({
  name: 'tradeInput',
  initialState,
  reducers: {
    clear: () => initialState,
    setBuyAsset: (state, action: PayloadAction<Asset>) => {
      const asset = action.payload

      // Prevent doodling state when no change is made
      if (asset.assetId === state.buyAsset.assetId) {
        return
      }

      // Handle the user selecting the same asset for both buy and sell
      const isSameAsSellAsset = asset.assetId === state.sellAsset.assetId
      if (isSameAsSellAsset) {
        state.sellAsset = state.buyAsset
        // clear the sell amount when switching assets
        state.sellAmountCryptoPrecision = '0'
      }

      // Reset the buyAssetAccountId if the chain has changed
      if (asset.chainId !== state.buyAsset.chainId) {
        state.buyAssetAccountId = undefined
      }

      // Reset the manual receive address
      state.manualReceiveAddress = undefined

      state.buyAsset = asset
    },
    setSellAsset: (state, action: PayloadAction<Asset>) => {
      const asset = action.payload

      // Prevent doodling state when no change is made
      if (asset.assetId === state.sellAsset.assetId) {
        return
      }

      // Handle the user selecting the same asset for both buy and sell
      const isSameAsBuyAsset = asset.assetId === state.buyAsset.assetId
      if (isSameAsBuyAsset) state.buyAsset = state.sellAsset

      // clear the sell amount
      state.sellAmountCryptoPrecision = '0'

      // Reset the sellAssetAccountId if the chain has changed
      if (asset.chainId !== state.sellAsset.chainId) {
        state.sellAssetAccountId = undefined
      }

      // Reset the manual receive address
      state.manualReceiveAddress = undefined

      state.sellAsset = action.payload
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
    switchAssets: state => {
      // Switch the assets
      const buyAsset = state.sellAsset
      state.sellAsset = state.buyAsset
      state.buyAsset = buyAsset
      state.sellAmountCryptoPrecision = '0'

      // Switch the account IDs
      const sellAssetAccountId = state.sellAssetAccountId
      state.sellAssetAccountId = state.buyAssetAccountId
      state.buyAssetAccountId = sellAssetAccountId

      // Reset the manual receive address
      state.manualReceiveAddress = undefined
    },
    setManualReceiveAddress: (state, action: PayloadAction<string | undefined>) => {
      state.manualReceiveAddress = action.payload
    },
    setManualReceiveAddressIsValidating: (state, action: PayloadAction<boolean>) => {
      state.manualReceiveAddressIsValidating = action.payload
    },
    setManualReceiveAddressIsEditing: (state, action: PayloadAction<boolean>) => {
      state.manualReceiveAddressIsEditing = action.payload
    },
    setManualReceiveAddressIsValid(state, action: PayloadAction<boolean | undefined>) {
      state.manualReceiveAddressIsValid = action.payload
    },
    setSlippagePreferencePercentage: (state, action: PayloadAction<string | undefined>) => {
      state.slippagePreferencePercentage = action.payload
    },
    setIsInputtingFiatSellAmount: (state, action: PayloadAction<boolean>) => {
      state.isInputtingFiatSellAmount = action.payload
    },
  },
})
