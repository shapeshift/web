import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getByMarketCap, getMarketData } from '@shapeshiftoss/market-service'
import { ChainTypes, CoinGeckoMarketCapResult, MarketData } from '@shapeshiftoss/types'

export type MarketDataState = {
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
    const marketCap = await getByMarketCap()
    return { marketCap }
  } catch (error) {
    console.error(error)
    return {}
  }
})

const initialState: MarketDataState = {
  marketData: {}
}

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchMarketData.fulfilled, (state, { payload, meta }) => {
      const tokenId = meta.arg.tokenId ?? meta.arg.chain
      if (payload[tokenId]) {
        state.marketData[tokenId] = payload[tokenId]
      }
    })

    builder.addCase(fetchMarketCaps.fulfilled, (state, { payload }) => {
      const { marketCap } = payload
      if (!marketCap) return
      state.marketCap = marketCap
    })
  }
})
