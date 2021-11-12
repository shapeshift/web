import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { getByMarketCap, getMarketData, getPriceHistory } from '@shapeshiftoss/market-service'
import {
  ChainTypes,
  CoinGeckoMarketCapResult,
  GetByMarketCapArgs,
  HistoryData,
  HistoryTimeframe,
  MarketData
} from '@shapeshiftoss/types'

export type MarketDataState = {
  loading: boolean
  marketCap?: CoinGeckoMarketCapResult
  marketData: {
    [key: string]: MarketData
  }
  priceHistory: {
    [k in HistoryTimeframe]: {
      [k: CAIP19]: HistoryData[]
    }
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

export const fetchPriceHistory = createAsyncThunk(
  'marketData/priceHistory',
  // assets as caip19 array
  async ({ assets, timeframe }: { assets: string[]; timeframe: HistoryTimeframe }) =>
    Promise.allSettled(
      assets.map(async asset => await getPriceHistory({ timeframe, ...caip19.fromCAIP19(asset) }))
    )
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
  priceHistory: {
    [HistoryTimeframe.HOUR]: {},
    [HistoryTimeframe.DAY]: {},
    [HistoryTimeframe.WEEK]: {},
    [HistoryTimeframe.MONTH]: {},
    [HistoryTimeframe.YEAR]: {},
    [HistoryTimeframe.ALL]: {}
  },
  loading: false
}

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchPriceHistory.pending, state => {
      state.loading = false
    })
    builder.addCase(fetchPriceHistory.rejected, state => {
      state.loading = false
    })
    builder.addCase(fetchPriceHistory.fulfilled, (state, { payload, meta }) => {
      const { assets, timeframe } = meta.arg
      payload.forEach((price, idx) => {
        if (price.status === 'rejected') return
        state.priceHistory[timeframe][assets[idx]] = price.value.map(({ date, price }) => ({
          date: date.valueOf().toString(), // dates aren't serializable in store
          price
        }))
      })
      state.loading = false
    })
    builder.addCase(fetchMarketData.pending, state => {
      state.loading = false
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
      state.loading = false
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
