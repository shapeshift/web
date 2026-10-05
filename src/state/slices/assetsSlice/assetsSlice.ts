import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial, PartialRecord } from '@shapeshiftoss/types'

import { getAssetService } from '@/lib/asset-service'
import { BASE_RTK_CREATE_API_CONFIG } from '@/state/apis/const'

export type AssetsState = {
  byId: AssetsByIdPartial
  ids: AssetId[]
  relatedAssetIndex: PartialRecord<AssetId, AssetId[]>
  // Assets that are not part of the generated asset data, e.g. custom tokens and placeholders
  runtimeAssetIds: AssetId[]
  // The runtime assets a user imported, which are kept when the generated assets are replaced
  customAssetIds: AssetId[]
  // The asset service version the generated assets were last loaded from
  version: string | undefined
}

export const initialState: AssetsState = {
  byId: {},
  ids: [],
  relatedAssetIndex: {},
  runtimeAssetIds: [],
  customAssetIds: [],
  version: undefined,
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

export type UpsertAssetsPayload = Pick<AssetsState, 'byId' | 'ids'>

type SetGeneratedAssetsPayload = Pick<
  AssetsState,
  'byId' | 'ids' | 'relatedAssetIndex' | 'version'
> & {
  watchedAssetIds: AssetId[]
}

export const assets = createSlice({
  name: 'assets',
  initialState,
  selectors: {
    selectAssetsById: state => state.byId,
    selectAssetIds: state => state.ids,
    selectRelatedAssetIndex: state => state.relatedAssetIndex,
    selectVersion: state => state.version,
  },
  reducers: create => ({
    clear: create.reducer(() => initialState),
    // Replaces the assets wholesale, so removals and the sort order apply. Only the runtime assets a user imported
    // or is watching are kept, the others are rebuilt as they are needed
    setGeneratedAssets: create.reducer(
      (state, action: PayloadAction<SetGeneratedAssetsPayload>) => {
        const { byId, ids, relatedAssetIndex, version, watchedAssetIds } = action.payload

        const isKeptRuntimeAsset = (assetId: AssetId) =>
          state.runtimeAssetIds.includes(assetId) && state.byId[assetId] && !byId[assetId]

        const customAssetIds = state.customAssetIds.filter(isKeptRuntimeAsset)
        const runtimeAssetIds = Array.from(
          new Set(customAssetIds.concat(watchedAssetIds.filter(isKeptRuntimeAsset))),
        )
        const runtimeAssetsById = Object.fromEntries(
          runtimeAssetIds.map(assetId => [assetId, state.byId[assetId]]),
        )

        state.byId = Object.assign({}, byId, runtimeAssetsById)
        state.ids = ids.concat(runtimeAssetIds)
        state.relatedAssetIndex = relatedAssetIndex
        state.runtimeAssetIds = runtimeAssetIds
        state.customAssetIds = customAssetIds
        state.version = version
      },
    ),
    upsertAssets: create.reducer((state, action: PayloadAction<UpsertAssetsPayload>) => {
      // Ignore empty upserts - don't create new references for no reason
      if (action.payload.ids.length === 0 && Object.keys(action.payload.byId).length === 0) {
        return
      }

      const newAssetIds = action.payload.ids.filter(
        assetId => !state.byId[assetId] && action.payload.byId[assetId],
      )

      state.byId = Object.assign({}, state.byId, action.payload.byId) // upsert
      // Note this preserves the original sorting while removing duplicates.
      state.ids = Array.from(new Set(state.ids.concat(action.payload.ids)))
      state.runtimeAssetIds = Array.from(new Set(state.runtimeAssetIds.concat(newAssetIds)))
    }),
    // Placeholders are built from a state snapshot that can predate the asset service load, so they must never replace a known asset
    addPlaceholderAssets: create.reducer((state, action: PayloadAction<UpsertAssetsPayload>) => {
      const ids = action.payload.ids.filter(assetId => !state.byId[assetId])
      if (ids.length === 0) return

      const byId = Object.fromEntries(ids.map(assetId => [assetId, action.payload.byId[assetId]]))

      state.byId = Object.assign({}, state.byId, byId)
      state.ids = Array.from(new Set(state.ids.concat(ids)))
      state.runtimeAssetIds = Array.from(new Set(state.runtimeAssetIds.concat(ids)))
    }),
    upsertAsset: create.reducer((state, action: PayloadAction<Asset>) => {
      const { assetId } = action.payload
      if (!state.byId[assetId]) state.runtimeAssetIds.push(assetId)

      state.byId[assetId] = Object.assign({}, state.byId[assetId], action.payload)
      // Note this preserves the original sorting while removing duplicates.
      state.ids = Array.from(new Set(state.ids.concat(assetId)))
    }),
    // A custom asset is one a user chose to import, as opposed to one the app came across
    addCustomAsset: create.reducer((state, action: PayloadAction<Asset>) => {
      const { assetId } = action.payload

      const isGeneratedAsset = state.byId[assetId] && !state.runtimeAssetIds.includes(assetId)
      if (isGeneratedAsset) return

      state.byId[assetId] = Object.assign({}, state.byId[assetId], action.payload)
      state.ids = Array.from(new Set(state.ids.concat(assetId)))
      state.runtimeAssetIds = Array.from(new Set(state.runtimeAssetIds.concat(assetId)))
      state.customAssetIds = Array.from(new Set(state.customAssetIds.concat(assetId)))
    }),
  }),
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
          const service = getAssetService()
          const { description, isTrusted } = await service.description(assetId, selectedLocale)

          // The description can resolve before the asset is loaded, and there is nothing to add it to yet
          if (!originalAsset) return { data: description }

          const byId = {
            [assetId]: Object.assign(originalAsset, { description, isTrusted }),
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
