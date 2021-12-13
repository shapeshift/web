import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import { getAssetService } from 'lib/assetService'
import { ReduxState } from 'state/reducer'

export type AssetsState = {
  byId: {
    [key: CAIP19]: Asset
  }
  ids: CAIP19[]
}

export const fetchAsset = createAsyncThunk('asset/fetchAsset', async (assetCAIP19: CAIP19) => {
  const service = await getAssetService()
  const asset = service?.byTokenId({ ...caip19.fromCAIP19(assetCAIP19) })
  const description = await service?.description({ asset })
  const result = { ...asset, description }
  return result
})

export const fetchAssets = createAsyncThunk(
  'asset/fetchAssets',
  // TODO(0xdef1cafe): change this to caip2 - we will actually need chain and network in future
  async ({ network }: { network: NetworkTypes }) => {
    const service = await getAssetService()
    return service?.byNetwork(network)
  }
)

const initialState: AssetsState = {
  byId: {},
  ids: []
}

export const assets = createSlice({
  name: 'asset',
  initialState,
  reducers: {
    setAssets: (state, action: PayloadAction<AssetsState>) => {
      state.byId = { ...state.byId, ...action.payload.byId } // upsert
      state.ids = Array.from(new Set([...state.ids, ...action.payload.ids]))
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchAsset.fulfilled, (state, { payload, meta }) => {
        const assetCAIP19 = meta.arg
        state.byId[assetCAIP19] = payload
        if (!state.ids.includes(assetCAIP19)) state.ids.push(assetCAIP19)
      })
      .addCase(fetchAsset.rejected, (state, { payload, meta }) => {
        console.error('fetchAsset rejected')
      })
      .addCase(fetchAssets.fulfilled, (state, { payload: assets }) => {
        const byId = assets.reduce<AssetsState['byId']>((acc, cur) => {
          const { caip19 } = cur
          acc[caip19] = cur
          return acc
        }, {})
        state.byId = byId

        assets?.forEach(({ caip19 }) => {
          if (!state.ids.includes(caip19)) state.ids.push(caip19)
        })
      })
  }
})

export const assetApi = createApi({
  reducerPath: 'assetApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getAssets: build.query<AssetsState, void>({
      // all assets
      queryFn: async args => {
        const service = await getAssetService()
        const assetArray = service?.byNetwork(NetworkTypes.MAINNET)
        const data = assetArray.reduce<AssetsState>((acc, cur) => {
          const { caip19 } = cur
          acc.byId[caip19] = cur
          acc.ids.push(caip19)
          return acc
        }, cloneDeep(initialState))
        return { data }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        data && dispatch(assets.actions.setAssets(data))
      }
    }),
    getAssetDescriptions: build.query<AssetsState, CAIP19[]>({
      queryFn: async (assetIds, { getState }) => {
        const service = await getAssetService()
        // limitation of redux tookit https://redux-toolkit.js.org/rtk-query/api/createApi#queryfn
        const { byId: byIdOriginal, ids } = (getState() as any).assets as AssetsState
        const byId = cloneDeep(byIdOriginal)
        const reqs = assetIds.map(async id => service.description({ asset: byId[id] }))
        const responses = await Promise.allSettled(reqs)
        responses.forEach((res, idx) => {
          if (res.status === 'rejected') {
            console.warn(`getAssetDescription: failed to fetch description for ${assetIds[idx]}`)
            return
          }
          byId[assetIds[idx]].description = res.value
        })

        const data = { byId, ids }
        return { data }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        data && dispatch(assets.actions.setAssets(data))
      }
    })
  })
})

export const { useGetAssetsQuery } = assetApi

export const selectAssetByCAIP19 = createSelector(
  (state: ReduxState) => state.assets.byId,
  (_state: ReduxState, CAIP19: CAIP19) => CAIP19,
  (byId, CAIP19) => byId[CAIP19]
)

// TODO(0xdef1cafe): add caip19s to buy and sell assets in swapper and remove this
export const selectAssetBySymbol = createSelector(
  (state: ReduxState) => state.assets.byId,
  (_state: ReduxState, symbol: string) => symbol,
  (byId, symbol) => Object.values(byId).find(asset => asset.symbol === symbol)
)

// asset descriptions get lazily updated, this changes often
// until we do the assets provider
export const selectAssetsById = createSelector(
  (state: ReduxState) => state.assets.byId,
  byId => byId
)

// these will only get set once, no need to memoize
export const selectAssetIds = (state: ReduxState) => state.assets.ids
