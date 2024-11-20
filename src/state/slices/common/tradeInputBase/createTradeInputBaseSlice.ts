import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'

export interface TradeInputBaseState {
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
          state.buyAccountId = undefined
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
          state.sellAccountId = undefined
        }

        state.manualReceiveAddress = undefined
        state.sellAsset = action.payload
      },
      setSellAccountId: (state, action: PayloadAction<AccountId | undefined>) => {
        state.sellAccountId = action.payload
      },
      setBuyAccountId: (state, action: PayloadAction<AccountId | undefined>) => {
        state.buyAccountId = action.payload
      },
      setSellAmountCryptoPrecision: (state, action: PayloadAction<string>) => {
        state.sellAmountCryptoPrecision = bnOrZero(action.payload).toString()
      },
      switchAssets: state => {
        const buyAsset = state.sellAsset
        state.sellAsset = state.buyAsset
        state.buyAsset = buyAsset
        state.sellAmountCryptoPrecision = '0'

        const sellAssetAccountId = state.sellAccountId
        state.sellAccountId = state.buyAccountId
        state.buyAccountId = sellAssetAccountId

        state.manualReceiveAddress = undefined
      },
      setManualReceiveAddress: (state, action: PayloadAction<string | undefined>) => {
        state.manualReceiveAddress = action.payload
      },
      setIsManualReceiveAddressValidating: (state, action: PayloadAction<boolean>) => {
        state.isManualReceiveAddressValidating = action.payload
      },
      setIsManualReceiveAddressEditing: (state, action: PayloadAction<boolean>) => {
        state.isManualReceiveAddressEditing = action.payload
      },
      setIsManualReceiveAddressValid: (state, action: PayloadAction<boolean | undefined>) => {
        state.isManualReceiveAddressValid = action.payload
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
