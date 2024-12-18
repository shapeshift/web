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
  solanaChainId,
} from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial, PartialRecord } from '@shapeshiftoss/types'
import { getConfig } from 'config'
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

const config = getConfig()

const byId = Object.entries(service.assetsById).reduce<AssetsByIdPartial>(
  (prev, [assetId, asset]) => {
    if (!config.REACT_APP_FEATURE_OPTIMISM && asset.chainId === optimismChainId) return prev
    if (!config.REACT_APP_FEATURE_BNBSMARTCHAIN && asset.chainId === bscChainId) return prev
    if (!config.REACT_APP_FEATURE_POLYGON && asset.chainId === polygonChainId) return prev
    if (!config.REACT_APP_FEATURE_GNOSIS && asset.chainId === gnosisChainId) return prev
    if (!config.REACT_APP_FEATURE_ARBITRUM && asset.chainId === arbitrumChainId) return prev
    if (!config.REACT_APP_FEATURE_ARBITRUM_NOVA && asset.chainId === arbitrumNovaChainId)
      return prev
    if (!config.REACT_APP_FEATURE_BASE && asset.chainId === baseChainId) return prev
    if (!config.REACT_APP_FEATURE_SOLANA && asset.chainId === solanaChainId) return prev
    prev[assetId] = asset
    return prev
  },
  {},
)

export const initialState: AssetsState = {
  byId,
  ids: Object.keys(byId), // TODO: Use pre-sorted array to maintain pre-sorting of assets
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
    getAssetDescription: build.query<
      UpsertAssetsPayload,
      { assetId: AssetId | undefined; selectedLocale: string }
    >({
      queryFn: async ({ assetId, selectedLocale }, { getState, dispatch }) => {
        if (!assetId) {
          throw new Error('assetId not provided')
        }

        // limitation of redux tookit https://redux-toolkit.js.org/rtk-query/api/createApi#queryfn
        const { byId: byIdOriginal } = (getState() as any).assets as AssetsState
        try {
          const { description, isTrusted } = await service.description(assetId, selectedLocale)
          const originalAsset = byIdOriginal[assetId]
          const byId = {
            [assetId]: originalAsset && Object.assign(originalAsset, { description, isTrusted }),
          }
          const data = { byId, ids: [assetId] }

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

export const { useGetAssetDescriptionQuery } = assetApi
