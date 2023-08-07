import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  bscChainId,
  fromAssetId,
  gnosisChainId,
  optimismChainId,
  osmosisChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import cloneDeep from 'lodash/cloneDeep'
import type { Asset } from 'lib/asset-service'
import { AssetService } from 'lib/asset-service'
import type { PartialRecord } from 'lib/utils'
import { sha256 } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

import { chainIdToFeeAssetId } from '../portfolioSlice/utils'

let service: AssetService | undefined = undefined

// do not export this, views get data from selectors
// or directly from the store outside react components
const getAssetService = () => {
  if (!service) {
    service = new AssetService()
  }

  return service
}

export type AssetsById = PartialRecord<AssetId, Asset>

export type AssetsState = {
  byId: AssetsById
  ids: AssetId[]
}

const initialState: AssetsState = {
  byId: {},
  ids: [],
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

export type MinimalAsset = Partial<Asset> & Pick<Asset, 'assetId' | 'symbol' | 'name' | 'precision'>

/**
 * utility to create an asset from minimal asset data from external sources at runtime
 * e.g. zapper/zerion/etherscan
 * required fields are assetId, symbol, name, precision
 * the rest can be inferred from existing data
 */
export const makeAsset = (minimalAsset: MinimalAsset): Asset => {
  const { assetId } = minimalAsset

  const color = (() => {
    if (minimalAsset.color) return minimalAsset.color
    const shaAssetId = sha256(assetId)
    return `#${shaAssetId.slice(0, 6)}`
  })()

  const chainId = (() => {
    if (minimalAsset.chainId) return minimalAsset.chainId
    return fromAssetId(assetId).chainId
  })()

  // currently, dynamic assets are LP pairs, and they have two icon urls and are rendered differently
  const icon = minimalAsset?.icon ?? ''

  type ExplorerLinks = Pick<Asset, 'explorer' | 'explorerTxLink' | 'explorerAddressLink'>

  const explorerLinks = ((): ExplorerLinks => {
    const feeAssetId = chainIdToFeeAssetId(chainId)
    if (!feeAssetId) throw new Error('makeAsset: feeAssetId not found')
    const feeAsset = getAssetService().assetsById[feeAssetId]
    return {
      explorer: feeAsset.explorer,
      explorerTxLink: feeAsset.explorerTxLink,
      explorerAddressLink: feeAsset.explorerAddressLink,
    }
  })()

  return Object.assign({}, minimalAsset, explorerLinks, { chainId, color, icon })
}

export const assets = createSlice({
  name: 'asset',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertAssets: (state, action: PayloadAction<AssetsState>) => {
      state.byId = Object.assign({}, state.byId, action.payload.byId) // upsert
      state.ids = Array.from(new Set(state.ids.concat(action.payload.ids)))
    },
    upsertAsset: (state, action: PayloadAction<Asset>) => {
      const { assetId } = action.payload
      state.byId[assetId] = Object.assign({}, state.byId[assetId], action.payload)
      state.ids = Array.from(new Set(state.ids.concat(assetId)))
    },
  },
})

export const assetApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'assetApi',
  endpoints: build => ({
    getAssets: build.query<AssetsState, void>({
      // all assets
      queryFn: (_, { getState }) => {
        const flags = selectFeatureFlags(getState() as ReduxState)
        const service = getAssetService()
        const assets = Object.entries(service?.assetsById ?? {}).reduce<AssetsById>(
          (prev, [assetId, asset]) => {
            if (!flags.Optimism && asset.chainId === optimismChainId) return prev
            if (!flags.BnbSmartChain && asset.chainId === bscChainId) return prev
            if (!flags.Polygon && asset.chainId === polygonChainId) return prev
            if (!flags.Gnosis && asset.chainId === gnosisChainId) return prev
            if (
              !flags.OsmosisSend &&
              !flags.OsmosisStaking &&
              !flags.OsmosisSwap &&
              !flags.OsmosisLP &&
              asset.chainId === osmosisChainId
            )
              return prev
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
        data && dispatch(assets.actions.upsertAssets(data))
      },
    }),
    getAssetDescription: build.query<
      AssetsState,
      { assetId: AssetId | undefined; selectedLocale: string }
    >({
      queryFn: async ({ assetId, selectedLocale }, { getState }) => {
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
        data && dispatch(assets.actions.upsertAssets(data))
      },
    }),
  }),
})

export const { useGetAssetsQuery, useGetAssetDescriptionQuery } = assetApi
