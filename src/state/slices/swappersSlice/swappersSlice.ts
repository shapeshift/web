import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads/build'
import type { Asset } from 'lib/asset-service'
import { localAssetData } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  SwapperName,
} from 'lib/swapper/api'
import { getLifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/getTradeQuote/getTradeQuote'
import type { LifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/utils/types'
import { getThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import { selectAssets, selectFeeAssetById } from '../assetsSlice/selectors'
import { selectCryptoMarketData } from '../marketDataSlice/selectors'
import type { MarketDataById } from '../marketDataSlice/types'

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
        // selectCryptoMarketData is used because prives are always in USD
        const marketDataById = selectCryptoMarketData(state) as MarketDataById<AssetId>
        const sellAssetMarketData = marketDataById[getTradeQuoteInput.sellAsset.assetId]
        if (!sellAssetMarketData)
          return {
            error: `no market data available for assetId ${getTradeQuoteInput.sellAsset.assetId}`,
          }
        const maybeQuote = await getLifiTradeQuote(
          getTradeQuoteInput,
          assets,
          sellAssetMarketData.price,
        )
        return { data: maybeQuote }
      },
    }),
    getThorTradeQuote: build.query<
      Result<LifiTradeQuote<false>, SwapErrorRight>,
      GetTradeQuoteInput
    >({
      queryFn: async (getTradeQuoteInput: GetTradeQuoteInput, { getState }) => {
        const state: ReduxState = getState() as ReduxState
        // selectCryptoMarketData is used because prives are always in USD
        const marketDataById = selectCryptoMarketData(state) as MarketDataById<AssetId>
        const feeAsset = selectFeeAssetById(state, getTradeQuoteInput.sellAsset.assetId) as
          | Asset
          | undefined
        const sellAssetMarketData = marketDataById[getTradeQuoteInput.sellAsset.assetId]
        const buyAssetMarketData = marketDataById[getTradeQuoteInput.buyAsset.assetId]
        const feeAssetMarketData = feeAsset ? marketDataById[feeAsset.assetId] : undefined

        if (!sellAssetMarketData)
          return {
            error: `no market data available for assetId ${getTradeQuoteInput.sellAsset.assetId}`,
          }

        if (!buyAssetMarketData)
          return {
            error: `no market data available for assetId ${getTradeQuoteInput.buyAsset.assetId}`,
          }

        if (!feeAssetMarketData)
          return {
            error: `no market data available for assetId ${feeAsset?.assetId}`,
          }

        const maybeQuote = await getThorTradeQuote(getTradeQuoteInput, {
          sellAssetUsdRate: sellAssetMarketData.price,
          buyAssetUsdRate: buyAssetMarketData.price,
          feeAssetUsdRate: feeAssetMarketData.price,
        })
        return { data: maybeQuote }
      },
    }),
  }),
})

export const { useGetLifiTradeQuoteQuery, useGetThorTradeQuoteQuery } = swappersApi
