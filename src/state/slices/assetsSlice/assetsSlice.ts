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
  try {
    const service = await getAssetService()
    const assetData = service?.byTokenId({ ...caip19.fromCAIP19(assetCAIP19) })
    return service?.description({ asset: assetData })
  } catch (error) {
    console.error(error)
    return ''
  }
})

export const fetchAssets = createAsyncThunk(
  'asset/fetchAssets',
  // TODO(0xdef1cafe): change this to caip2 - we will actually need chain and network in future
  async ({ network }: { network: NetworkTypes }) => {
    const service = await getAssetService()
    return service?.byNetwork(network)
  }
)

const initialState = {} as AssetsState

export const assets = createSlice({
  name: 'asset',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchAsset.fulfilled, (state, { payload: description, meta }) => {
        const assetCAIP19 = meta.arg
        if (!description) return
        state.byId[assetCAIP19].description = description
      })
      .addCase(fetchAssets.fulfilled, (state, { payload: assets }) => {
        assets?.forEach(asset => {
          const { caip19 } = asset
          state.byId[caip19] = asset
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

// TODO(0xdef1cafe): remove this and find by buy/
export const selectAssetBySymbol = createSelector(
  (state: ReduxState) => state.assets.byId,
  (_state: ReduxState, symbol: string) => symbol,
  (byId, symbol) => Object.values(byId).find(asset => asset.symbol === symbol)
)

export const selectAssetsById = createSelector(
  (state: ReduxState) => state.assets.byId,
  byId => byId
)
