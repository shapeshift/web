import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'

export interface TradeInputBaseState {
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

/**
 * Creates a reusable Redux slice for trade input functionality. This is a higher-order slice
 * factory that generates a slice with common trade-related reducers. It provides base functionality
 * for managing trade state like buy/sell assets, account IDs, amounts, and slippage preferences.
 * This allows multiple features (like trading and limit orders) to reuse the same reducer logic
 * while maintaining their own independent state.
 *
 * @param name - The name of the Redux slice
 * @param initialState - The initial state extending the base trade input state
 * @param extraReducers - Additional reducers specific to the implementing slice
 * @returns A configured Redux slice with all the base trade input reducers
 */
export function createTradeInputBaseSlice<
  S extends Record<string, any>,
  T extends TradeInputBaseState,
>({
  name,
  initialState,
  extraReducers = {} as S,
}: {
  name: string
  initialState: T
  extraReducers?: S
}) {
  return createSlice({
    name,
    initialState,
    reducers: {
      clear: () => initialState,
      setBuyAsset: (state, action: PayloadAction<Asset>) => {
        const asset = action.payload
        if (asset.assetId === state.buyAsset.assetId) return

        if (asset.assetId === state.sellAsset.assetId) {
          state.sellAsset = state.buyAsset
          state.sellAmountCryptoPrecision = '0'
        }

        if (asset.chainId !== state.buyAsset.chainId) {
          state.buyAssetAccountId = undefined
        }

        state.manualReceiveAddress = undefined
        state.buyAsset = asset
      },
      setSellAsset: (state, action: PayloadAction<Asset>) => {
        const asset = action.payload
        if (asset.assetId === state.sellAsset.assetId) return

        if (asset.assetId === state.buyAsset.assetId) {
          state.buyAsset = state.sellAsset
        }

        state.sellAmountCryptoPrecision = '0'

        if (asset.chainId !== state.sellAsset.chainId) {
          state.sellAssetAccountId = undefined
        }

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
        state.sellAmountCryptoPrecision = bnOrZero(action.payload).toString()
      },
      switchAssets: state => {
        const buyAsset = state.sellAsset
        state.sellAsset = state.buyAsset
        state.buyAsset = buyAsset
        state.sellAmountCryptoPrecision = '0'

        const sellAssetAccountId = state.sellAssetAccountId
        state.sellAssetAccountId = state.buyAssetAccountId
        state.buyAssetAccountId = sellAssetAccountId

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
      setManualReceiveAddressIsValid: (state, action: PayloadAction<boolean | undefined>) => {
        state.manualReceiveAddressIsValid = action.payload
      },
      setIsInputtingFiatSellAmount: (state, action: PayloadAction<boolean>) => {
        state.isInputtingFiatSellAmount = action.payload
      },
      setSlippagePreferencePercentage: (
        state: TradeInputBaseState,
        action: PayloadAction<string | undefined>,
      ) => {
        state.slippagePreferencePercentage = action.payload
      },
      ...extraReducers,
    },
  })
}
