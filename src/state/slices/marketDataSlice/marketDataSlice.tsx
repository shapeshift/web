import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getByMarketCap, getMarketData } from '@shapeshiftoss/market-service'
import {
  ChainTypes,
  CoinGeckoMarketCapResult,
  GetByMarketCapArgs,
  MarketData
} from '@shapeshiftoss/types'

export type MarketDataState = {
  loading: boolean
  marketCap?: CoinGeckoMarketCapResult
  marketData: {
    [key: string]: MarketData
  }
}

export const fetchMarketData = createAsyncThunk(
  'marketData/fetchMarketData',
  async ({ tokenId, chain }: { tokenId?: string; chain: ChainTypes }) => {
    try {
      const marketData: MarketData = await getMarketData({
        chain,
        tokenId
      })
      if (!marketData) return {}
      return { [tokenId || chain]: marketData }
    } catch (error) {
      console.error(error)
      return {}
    }
  }
)

export const fetchMarketCaps = createAsyncThunk('marketData/fetchMarketCaps', async () => {
  try {
    const args: GetByMarketCapArgs = { pages: 1, perPage: 250 }
    const marketCap = await getByMarketCap(args)
    return { marketCap }
  } catch (error) {
    console.error(error)
    return {}
  }
})

const initialState: MarketDataState = {
  marketData: {},
  loading: false
}

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchMarketData.pending, state => {
      state.loading = true
    })
    builder.addCase(fetchMarketData.rejected, state => {
      state.loading = false
    })
    builder.addCase(fetchMarketData.fulfilled, (state, { payload, meta }) => {
      const tokenId = meta.arg.tokenId ?? meta.arg.chain
      if (payload[tokenId]) {
        state.marketData[tokenId] = payload[tokenId]
      }
      state.loading = false
    })
    builder.addCase(fetchMarketCaps.pending, state => {
      state.loading = true
    })
    builder.addCase(fetchMarketCaps.rejected, state => {
      state.loading = false
    })
    builder.addCase(fetchMarketCaps.fulfilled, (state, { payload }) => {
      const { marketCap } = payload
      if (!marketCap) return
      state.marketCap = marketCap
      state.loading = false
    })
  }
})
