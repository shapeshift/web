import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import type { Asset } from 'lib/asset-service'
import { localAssetData } from 'lib/asset-service'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  SwapperName,
} from 'lib/swapper/api'
import { getLifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/getTradeQuote/getTradeQuote'
import type { LifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/utils/types'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import { selectAssets } from '../assetsSlice/selectors'
import { selectMarketDataById } from '../marketDataSlice/selectors'

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
      state.sellAmountCryptoPrecision = action.payload
    },
  },
})

export const swappersApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swappersApi',
  endpoints: build => ({
    getLifiTradeQuote: build.query<
      Result<LifiTradeQuote<false>, SwapErrorRight>,
      GetTradeQuoteInput
    >({
      queryFn: async (getTradeQuoteInput: GetEvmTradeQuoteInput, { getState }) => {
        const state: ReduxState = getState() as ReduxState
        const assets: Partial<Record<AssetId, Asset>> = selectAssets(state)
        const sellAssetMarketData = selectMarketDataById(
          state,
          getTradeQuoteInput.sellAsset.assetId,
        ) as MarketData
        const maybeQuote = await getLifiTradeQuote(
          getTradeQuoteInput,
          assets,
          sellAssetMarketData.price,
        )
        return { data: maybeQuote }
      },
    }),
  }),
})

export const { useGetLifiTradeQuoteQuery } = swappersApi
