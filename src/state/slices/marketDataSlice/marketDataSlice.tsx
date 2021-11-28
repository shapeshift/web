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
      [k: CAIP19]: {
        loading: boolean
        data: HistoryData[]
      }
    }
  }
}

export const fetchMarketData = createAsyncThunk(
  'marketData/fetchMarketData',
  async ({ tokenId, chain }: { tokenId?: string; chain: ChainTypes }) =>
    getMarketData({
      chain,
      tokenId
    })
)

export const fetchPriceHistory = createAsyncThunk(
  'marketData/priceHistory',
  async ({ asset, timeframe }: { asset: CAIP19; timeframe: HistoryTimeframe }) => {
    const priceHistory = await getPriceHistory({ timeframe, ...caip19.fromCAIP19(asset) })
    const result = priceHistory.map(({ date, price }) => ({
      date: date.valueOf().toString(), // dates aren't serializable in redux actions or state
      price
    }))
    return result
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
    builder.addCase(fetchPriceHistory.pending, (state, { meta }) => {
      const { asset, timeframe } = meta.arg
      state.priceHistory[timeframe][asset].loading = true
    })
    builder.addCase(fetchPriceHistory.rejected, (state, { meta }) => {
      const { asset, timeframe } = meta.arg
      const priceHistoryForAsset = {
        data: state.priceHistory?.[timeframe]?.[asset]?.data ?? [],
        loading: false
      }
      state.priceHistory[timeframe][asset] = priceHistoryForAsset
    })
    builder.addCase(fetchPriceHistory.fulfilled, (state, { payload, meta }) => {
      const { asset, timeframe } = meta.arg
      state.priceHistory[timeframe][asset].data = payload
      state.priceHistory[timeframe][asset].loading = false
    })
    builder.addCase(fetchMarketData.pending, state => {
      state.loading = true
    })
    builder.addCase(fetchMarketData.rejected, state => {
      state.loading = false
    })
    builder.addCase(fetchMarketData.fulfilled, (state, { payload, meta }) => {
      const tokenId = meta.arg.tokenId ?? meta.arg.chain
      state.marketData[tokenId] = payload
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
      state.loading = false
      if (!marketCap) return
      state.marketCap = marketCap
    })
  }
})
