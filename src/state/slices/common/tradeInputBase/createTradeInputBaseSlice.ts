import type { Draft, PayloadAction, SliceSelectors } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { bnOrZero } from '@/lib/bignumber/bignumber'

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
  selectedSellAssetChainId: ChainId | 'All'
  selectedBuyAssetChainId: ChainId | 'All'
}

const getBaseReducers = <T extends TradeInputBaseState>(initialState: T) => ({
  clear: () => initialState,
  setBuyAsset: (state: Draft<T>, action: PayloadAction<Asset>) => {
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
  setSellAsset: (state: Draft<T>, action: PayloadAction<Asset>) => {
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
  setSellAccountId: (state: Draft<T>, action: PayloadAction<AccountId | undefined>) => {
    state.sellAccountId = action.payload
  },
  setBuyAccountId: (state: Draft<T>, action: PayloadAction<AccountId | undefined>) => {
    state.buyAccountId = action.payload
  },
  setSellAmountCryptoPrecision: (state: Draft<T>, action: PayloadAction<string>) => {
    state.sellAmountCryptoPrecision = action.payload ? bnOrZero(action.payload).toString() : ''
  },
  setQuickBuySelection: (
    state: Draft<T>,
    action: PayloadAction<{ buyAsset: Asset; sellAsset: Asset; sellAmountCryptoPrecision: string }>,
  ) => {
    const { buyAsset, sellAsset, sellAmountCryptoPrecision } = action.payload
    state.sellAmountCryptoPrecision = bnOrZero(sellAmountCryptoPrecision).toString()
    state.isInputtingFiatSellAmount = false

    if (sellAsset.chainId !== state.sellAsset.chainId) {
      state.sellAccountId = undefined
    }

    if (buyAsset.chainId !== state.buyAsset.chainId) {
      state.buyAccountId = undefined
    }
    state.buyAsset = buyAsset
    state.sellAsset = sellAsset
    state.manualReceiveAddress = undefined
  },
  switchAssets: (
    state: Draft<T>,
    action: PayloadAction<{
      sellAssetUsdRate: string | undefined
      buyAssetUsdRate: string | undefined
    }>,
  ) => {
    const { sellAssetUsdRate, buyAssetUsdRate } = action.payload
    const sellAmountUsd = bnOrZero(state.sellAmountCryptoPrecision).times(sellAssetUsdRate ?? '0')

    // Avoid division by zero
    state.sellAmountCryptoPrecision = bnOrZero(buyAssetUsdRate).isZero()
      ? '0'
      : sellAmountUsd.div(bnOrZero(buyAssetUsdRate)).toFixed()

    const buyAsset = state.sellAsset
    state.sellAsset = state.buyAsset
    state.buyAsset = buyAsset

    const sellAssetAccountId = state.sellAccountId
    state.sellAccountId = state.buyAccountId
    state.buyAccountId = sellAssetAccountId

    // Also switch the selected chain IDs
    const selectedSellAssetChainId = state.selectedSellAssetChainId
    state.selectedSellAssetChainId = state.selectedBuyAssetChainId
    state.selectedBuyAssetChainId = selectedSellAssetChainId

    state.manualReceiveAddress = undefined
  },
  setManualReceiveAddress: (state: Draft<T>, action: PayloadAction<string | undefined>) => {
    state.manualReceiveAddress = action.payload
  },
  setIsManualReceiveAddressValidating: (state: Draft<T>, action: PayloadAction<boolean>) => {
    state.isManualReceiveAddressValidating = action.payload
  },
  setIsManualReceiveAddressEditing: (state: Draft<T>, action: PayloadAction<boolean>) => {
    state.isManualReceiveAddressEditing = action.payload
  },
  setIsManualReceiveAddressValid: (state: Draft<T>, action: PayloadAction<boolean | undefined>) => {
    state.isManualReceiveAddressValid = action.payload
  },
  setIsInputtingFiatSellAmount: (state: Draft<T>, action: PayloadAction<boolean>) => {
    state.isInputtingFiatSellAmount = action.payload
  },
  setSelectedSellAssetChainId: (state: Draft<T>, action: PayloadAction<ChainId | 'All'>) => {
    state.selectedSellAssetChainId = action.payload
  },
  setSelectedBuyAssetChainId: (state: Draft<T>, action: PayloadAction<ChainId | 'All'>) => {
    state.selectedBuyAssetChainId = action.payload
  },
})

export type BaseReducers<T extends TradeInputBaseState> = ReturnType<typeof getBaseReducers<T>>

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
  U extends SliceSelectors<T> = SliceSelectors<T>,
>({
  name,
  initialState,
  extraReducers,
  selectors,
}: {
  name: string
  initialState: T
  extraReducers: (baseReducers: BaseReducers<T>) => S
  selectors?: U
}) {
  const baseReducers = getBaseReducers(initialState)
  return createSlice({
    name,
    initialState,
    // Note: extraReducers are added last to deliberately override baseReducers where needed
    reducers: { ...baseReducers, ...extraReducers(baseReducers) },
    selectors,
  })
}
