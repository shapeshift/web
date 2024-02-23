import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  bscChainId,
  fromAssetId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial, PartialRecord } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import cloneDeep from 'lodash/cloneDeep'
import { AssetService } from 'lib/asset-service'
import { sha256 } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

import { chainIdToFeeAssetId } from '../portfolioSlice/utils'

// do not export this, views get data from selectors
// or directly from the store outside react components
const assetService = new AssetService()

const config = getConfig()

const assetsById = Object.entries(assetService.assetsById).reduce<AssetsByIdPartial>(
  (prev, [assetId, asset]) => {
    if (!config.REACT_APP_FEATURE_OPTIMISM && asset.chainId === optimismChainId) return prev
    if (!config.REACT_APP_FEATURE_BNBSMARTCHAIN && asset.chainId === bscChainId) return prev
    if (!config.REACT_APP_FEATURE_POLYGON && asset.chainId === polygonChainId) return prev
    if (!config.REACT_APP_FEATURE_GNOSIS && asset.chainId === gnosisChainId) return prev
    if (!config.REACT_APP_FEATURE_ARBITRUM && asset.chainId === arbitrumChainId) return prev
    if (!config.REACT_APP_FEATURE_ARBITRUM_NOVA && asset.chainId === arbitrumNovaChainId)
      return prev
    prev[assetId] = asset
    return prev
  },
  {},
)

export type AssetsState = {
  fungible: {
    byId: AssetsByIdPartial
    ids: AssetId[]
  }
  nonFungible: {
    byId: AssetsByIdPartial
    ids: AssetId[]
  }
  relatedAssetIndex: PartialRecord<AssetId, AssetId[]>
}

export const initialState: AssetsState = {
  fungible: {
    byId: assetsById,
    ids: Object.keys(assetsById),
  },
  nonFungible: {
    byId: {},
    ids: [],
  },
  relatedAssetIndex: assetService.relatedAssetIndex,
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
export type UpsertAssetsPayload = AssetsState['nonFungible']

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
    const feeAsset = assetService.assetsById[feeAssetId]
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
    upsertAssets: (state, action: PayloadAction<UpsertAssetsPayload>) => {
      state.nonFungible.byId = Object.assign({}, state.nonFungible.byId, action.payload.byId) // upsert
      state.nonFungible.ids = Object.keys(state.nonFungible.byId)
    },
    upsertAsset: (state, action: PayloadAction<Asset>) => {
      const { assetId } = action.payload
      state.nonFungible.byId[assetId] = Object.assign(
        {},
        state.nonFungible.byId[assetId],
        action.payload,
      )
      state.nonFungible.ids = Object.keys(state.nonFungible.byId)
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

        const assetsById = Object.entries(assetService.assetsById).reduce<AssetsByIdPartial>(
          (prev, [assetId, asset]) => {
            if (!flags.Optimism && asset.chainId === optimismChainId) return prev
            if (!flags.BnbSmartChain && asset.chainId === bscChainId) return prev
            if (!flags.Polygon && asset.chainId === polygonChainId) return prev
            if (!flags.Gnosis && asset.chainId === gnosisChainId) return prev
            if (!flags.Arbitrum && asset.chainId === arbitrumChainId) return prev
            if (!flags.ArbitrumNova && asset.chainId === arbitrumNovaChainId) return prev
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
        // limitation of redux tookit https://redux-toolkit.js.org/rtk-query/api/createApi#queryfn
        const { byId: byIdOriginal, ids } = (getState() as any).assets
          .nonFungible as AssetsState['nonFungible']
        const byId = cloneDeep(byIdOriginal)
        try {
          const { description, isTrusted } = await assetService.description(assetId, selectedLocale)
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
