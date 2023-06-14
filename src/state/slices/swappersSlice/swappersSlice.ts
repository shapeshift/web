import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import { localAssetData } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { SwapperName } from 'lib/swapper/api'

import { defaultAsset } from '../assetsSlice/assetsSlice'

export enum StepTransactionStatus {
  Identified = 'identified', // The step is identified as being part of the execution flow
  Built = 'built', // The transaction has been built, awaiting user confirmation
  Executing = 'executing', // The transaction is in the process of being executed
  Complete = 'complete', // The transaction has been executed successfully
  Failed = 'failed', // The transaction failed at some point during its lifecycle
  Cancelled = 'cancelled', // The user cancelled the transaction
}

export type SwappersState = {
  selectedQuote: SwapperName | undefined
  buyAsset: Asset
  sellAsset: Asset
  sellAssetAccountId: AccountId | undefined
  receiveAddress: string | undefined
  sellAmountCryptoPrecision: string
}

// Define the initial state:
const initialState: SwappersState = {
  selectedQuote: undefined,
  buyAsset: localAssetData[foxAssetId] ?? defaultAsset,
  sellAsset: localAssetData[ethAssetId] ?? defaultAsset,
  sellAssetAccountId: undefined,
  receiveAddress: undefined,
  sellAmountCryptoPrecision: '0',
}

// Create the slice:
export const swappers = createSlice({
  name: 'swappers',
  initialState,
  reducers: {
    clear: () => initialState,
    setSelectedQuote: (state, action: PayloadAction<SwapperName>) => {
      state.selectedQuote = action.payload
    },
    setBuyAsset: (state, action: PayloadAction<Asset>) => {
      state.buyAsset = action.payload
    },
    setSellAsset: (state, action: PayloadAction<Asset>) => {
      state.sellAsset = action.payload
    },
    setSellAssetAccountId: (state, action: PayloadAction<AccountId | undefined>) => {
      state.sellAssetAccountId = action.payload
    },
    setReceiveAddress: (state, action: PayloadAction<string | undefined>) => {
      state.receiveAddress = action.payload
    },
    setSellAmountCryptoPrecision: (state, action: PayloadAction<string>) => {
      // dedupe 0, 0., 0.0, 0.00 etc
      state.sellAmountCryptoPrecision = bnOrZero(action.payload).toString()
    },
  },
})
