import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { Asset, NetworkTypes } from '@shapeshiftoss/types'
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
  reducers: {},
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

export const selectAssetsById = createSelector(
  (state: ReduxState) => state.assets.byId,
  byId => byId
)
