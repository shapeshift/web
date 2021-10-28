import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getMarketData } from '@shapeshiftoss/market-service'
import { ChainTypes, MarketData } from '@shapeshiftoss/types'

export type MarketDataState = { [key: string]: MarketData }

export const fetchMarketData = createAsyncThunk(
  'marketData/fetchMarketData',
  async ({ tokenId, chain }: { tokenId?: string; chain: ChainTypes }) => {
    try {
      const marketData: MarketData | null = await getMarketData({
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

const initialState = {} as MarketDataState

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchMarketData.fulfilled, (state, { payload, meta }) => {
      const tokenId = meta.arg.tokenId ?? meta.arg.chain
      if (payload[tokenId]) {
        state[tokenId] = payload[tokenId]
      }
    })
  }
})
