import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetService } from '@shapeshiftoss/asset-service'
import { AssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'

let service: AssetService | undefined = undefined

// do not export this, views get data from selectors
// or directly from the store outside react components
const getAssetService = async () => {
  if (!service) {
    service = new AssetService()
  }

  return service
}

export type AssetsById = {
  [key: AssetId]: Asset
}

export type AssetsState = {
  byId: AssetsById
  ids: AssetId[]
}

const initialState: AssetsState = {
  byId: {},
  ids: [],
}

export const assets = createSlice({
  name: 'asset',
  initialState,
  reducers: {
    clear: () => initialState,
    setAssets: (state, action: PayloadAction<AssetsState>) => {
      state.byId = { ...state.byId, ...action.payload.byId } // upsert
      state.ids = Array.from(new Set([...state.ids, ...action.payload.ids]))
    },
  },
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
      queryFn: async () => {
        // @ts-ignore
        const service = await getAssetService()
        const assetArray = service?.getAll()
        const data = {
          byId: assetArray ?? {},
          ids: Object.keys(assetArray) ?? [],
        }
        return { data }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        data && dispatch(assets.actions.setAssets(data))
      },
    }),
    getAssetDescription: build.query<AssetsState, AssetId>({
      queryFn: async (assetId, { getState }) => {
        const service = await getAssetService()
        // limitation of redux tookit https://redux-toolkit.js.org/rtk-query/api/createApi#queryfn
        const { byId: byIdOriginal, ids } = (getState() as any).assets as AssetsState
        const byId = cloneDeep(byIdOriginal)
        try {
          const { description, isTrusted } = await service.description(assetId)
          byId[assetId].description = description
          byId[assetId].isTrustedDescription = isTrusted
          const data = { byId, ids }
          return { data }
        } catch (e) {
          const data = `getAssetDescription: error fetching description for ${assetId}`
          const status = 400
          const error = { data, status }
          return { error }
        }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        data && dispatch(assets.actions.setAssets(data))
      },
    }),
  }),
})

export const { useGetAssetsQuery, useGetAssetDescriptionQuery } = assetApi
