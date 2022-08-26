import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { AssetService } from '@shapeshiftoss/asset-service'
import { Asset } from '@shapeshiftoss/asset-service'
import { AssetId, avalancheChainId, osmosisChainId } from '@shapeshiftoss/caip'
import cloneDeep from 'lodash/cloneDeep'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { ReduxState } from 'state/reducer'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

let service: AssetService | undefined = undefined

// do not export this, views get data from selectors
// or directly from the store outside react components
const getAssetService = async () => {
  if (!service) {
    service = new AssetService()
  }

  return service
}

export type AssetsById = Record<AssetId, Asset>

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
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'assetApi',
  endpoints: build => ({
    getAssets: build.query<AssetsState, void>({
      // all assets
      queryFn: async (_, { getState }) => {
        const { Avalanche, Osmosis } = selectFeatureFlags(getState() as ReduxState)

        const service = await getAssetService()
        const assets = Object.entries(service?.getAll() ?? {}).reduce<AssetsById>(
          (prev, [assetId, asset]) => {
            if (!Avalanche && asset.chainId === avalancheChainId) return prev
            if (!Osmosis && asset.chainId === osmosisChainId) return prev
            prev[assetId] = asset
            return prev
          },
          {},
        )
        const data = {
          byId: assets,
          ids: Object.keys(assets) ?? [],
        }
        return { data }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        data && dispatch(assets.actions.setAssets(data))
      },
    }),
    getAssetDescription: build.query<AssetsState, { assetId: AssetId; selectedLocale: string }>({
      queryFn: async ({ assetId, selectedLocale }, { getState }) => {
        const service = await getAssetService()
        // limitation of redux tookit https://redux-toolkit.js.org/rtk-query/api/createApi#queryfn
        const { byId: byIdOriginal, ids } = (getState() as any).assets as AssetsState
        const byId = cloneDeep(byIdOriginal)
        try {
          const { description, isTrusted } = await service.description(assetId, selectedLocale)
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
