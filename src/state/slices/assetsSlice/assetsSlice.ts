import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial, PartialRecord } from '@shapeshiftoss/types'
import { AssetService } from 'lib/asset-service'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

// do not export this, views get data from selectors
// or directly from the store outside react components
const service = new AssetService()

export type AssetsState = {
  byId: AssetsByIdPartial
  ids: AssetId[]
  relatedAssetIndex: PartialRecord<AssetId, AssetId[]>
}

export const initialState: AssetsState = {
  byId: service.assetsById,
  ids: service.assetIds,
  relatedAssetIndex: service.relatedAssetIndex,
}

export const defaultAsset: Asset = {
  assetId: '',
  chainId: '',
  symbol: 'N/A',
  name: 'Unknown',
  precision: 18,
  color: '#FFFFFF',
  icon: '',
  explorer: '',
  explorerTxLink: '',
  explorerAddressLink: '',
  relatedAssetKey: null,
}

export type UpsertAssetsPayload = Omit<AssetsState, 'relatedAssetIndex'>

export const assets = createSlice({
  name: 'asset',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertAssets: (state, action: PayloadAction<UpsertAssetsPayload>) => {
      state.byId = Object.assign({}, state.byId, action.payload.byId) // upsert
      state.ids = Array.from(new Set(state.ids.concat(action.payload.ids))) // TODO: Preserve sorting here
    },
    upsertAsset: (state, action: PayloadAction<Asset>) => {
      const { assetId } = action.payload
      state.byId[assetId] = Object.assign({}, state.byId[assetId], action.payload)
      state.ids = Array.from(new Set(state.ids.concat(assetId))) // TODO: Preserve sorting here
    },
  },
})

export const assetApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'assetApi',
  endpoints: build => ({
    getAssetDescription: build.query<
      string,
      { assetId: AssetId | undefined; selectedLocale: string }
    >({
      queryFn: async ({ assetId, selectedLocale }, { getState, dispatch }) => {
        if (!assetId) {
          throw new Error('assetId not provided')
        }

        // limitation of redux tookit https://redux-toolkit.js.org/rtk-query/api/createApi#queryfn
        const { byId: byIdOriginal } = (getState() as any).assets as AssetsState
        const originalAsset = byIdOriginal[assetId]

        try {
          const { description, isTrusted } = await service.description(assetId, selectedLocale)
          const byId = {
            [assetId]: originalAsset && Object.assign(originalAsset, { description, isTrusted }),
          }

          dispatch(assets.actions.upsertAssets({ byId, ids: [assetId] }))

          return { data: description }
        } catch (e) {
          const data = `getAssetDescription: error fetching description for ${assetId}`
          const status = 400
          const error = { data, status }
          return { error }
        }
      },
    }),
  }),
})

export const { useGetAssetDescriptionQuery } = assetApi
