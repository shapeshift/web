import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  baseChainId,
  bscChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial, PartialRecord } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import { AssetService } from 'lib/asset-service'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

let service: AssetService | undefined = undefined

// do not export this, views get data from selectors
// or directly from the store outside react components
const getAssetService = () => {
  if (!service) {
    service = new AssetService()
  }

  return service
}

export type AssetsState = {
  byId: AssetsByIdPartial
  ids: AssetId[]
  relatedAssetIndex: PartialRecord<AssetId, AssetId[]>
}

export const initialState: AssetsState = {
  byId: {},
  ids: [],
  relatedAssetIndex: {},
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
}

export type UpsertAssetsPayload = Omit<AssetsState, 'relatedAssetIndex'>

export const assets = createSlice({
  name: 'asset',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertAssets: (state, action: PayloadAction<UpsertAssetsPayload>) => {
      state.byId = Object.assign({}, state.byId, action.payload.byId) // upsert
      state.ids = Array.from(new Set(state.ids.concat(action.payload.ids)))
    },
    upsertAsset: (state, action: PayloadAction<Asset>) => {
      const { assetId } = action.payload
      state.byId[assetId] = Object.assign({}, state.byId[assetId], action.payload)
      state.ids = Array.from(new Set(state.ids.concat(assetId)))
    },
    setRelatedAssetIndex: (state, action: PayloadAction<PartialRecord<AssetId, AssetId[]>>) => {
      state.relatedAssetIndex = action.payload
    },
  },
})

export const assetApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'assetApi',
  endpoints: build => ({
    getAssets: build.query<UpsertAssetsPayload, void>({
      // all assets
      queryFn: (_, { getState, dispatch }) => {
        const flags = selectFeatureFlags(getState() as ReduxState)
        const service = getAssetService()

        dispatch(assets.actions.setRelatedAssetIndex(service.relatedAssetIndex))

        const assetsById = Object.entries(service?.assetsById ?? {}).reduce<AssetsByIdPartial>(
          (prev, [assetId, asset]) => {
            if (!flags.Optimism && asset.chainId === optimismChainId) return prev
            if (!flags.BnbSmartChain && asset.chainId === bscChainId) return prev
            if (!flags.Polygon && asset.chainId === polygonChainId) return prev
            if (!flags.Gnosis && asset.chainId === gnosisChainId) return prev
            if (!flags.Arbitrum && asset.chainId === arbitrumChainId) return prev
            if (!flags.ArbitrumNova && asset.chainId === arbitrumNovaChainId) return prev
            if (!flags.Base && asset.chainId === baseChainId) return prev
            prev[assetId] = asset
            return prev
          },
          {},
        )
        const data = {
          byId: assetsById,
          ids: Object.keys(assetsById) ?? [],
        }

        if (data) dispatch(assets.actions.upsertAssets(data))
        return { data }
      },
    }),
    getAssetDescription: build.query<
      UpsertAssetsPayload,
      { assetId: AssetId | undefined; selectedLocale: string }
    >({
      queryFn: async ({ assetId, selectedLocale }, { getState, dispatch }) => {
        if (!assetId) {
          throw new Error('assetId not provided')
        }
        const service = getAssetService()
        // limitation of redux tookit https://redux-toolkit.js.org/rtk-query/api/createApi#queryfn
        const { byId: byIdOriginal, ids } = (getState() as any).assets as AssetsState
        const byId = cloneDeep(byIdOriginal)
        try {
          const { description, isTrusted } = await service.description(assetId, selectedLocale)
          const originalAsset = byId[assetId]
          byId[assetId] = originalAsset && Object.assign(originalAsset, { description, isTrusted })
          const data = { byId, ids }

          if (data) dispatch(assets.actions.upsertAssets(data))
          return { data }
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

export const { useGetAssetsQuery, useGetAssetDescriptionQuery } = assetApi
