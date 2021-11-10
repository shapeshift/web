import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { Asset, ChainTypes, NetworkTypes, TokenAsset } from '@shapeshiftoss/types'
import { getAssetService } from 'lib/assetService'
import { ReduxState } from 'state/reducer'

export type FullAsset = Asset & { description?: string }
export type AssetsState = { [key: string]: Asset & { description?: string } }

export const fetchAsset = createAsyncThunk(
  'asset/fetchAsset',
  async ({
    tokenId,
    chain,
    network
  }: {
    tokenId?: string
    chain: ChainTypes
    network: NetworkTypes
  }) => {
    try {
      const service = await getAssetService()

      const assetData = service?.byTokenId({ chain, network, tokenId })
      const description = tokenId
        ? await service?.description({ chain })
        : await service?.description({ chain, tokenData: assetData as TokenAsset })
      if (!assetData) return {}
      if (!description) return { [tokenId || chain]: assetData }
      return { [tokenId || chain]: { ...assetData, description } }
    } catch (error) {
      console.error(error)
      return {}
    }
  }
)

export const fetchAssets = createAsyncThunk(
  'asset/fetchAssets',
  async ({ network }: { network: NetworkTypes }, thunkApi) => {
    try {
      const service = await getAssetService()
      const assets = service?.byNetwork(network)
      const assetsObj = {} as AssetsState
      const state = thunkApi.getState() as ReduxState

      assets.forEach((asset: Asset) => {
        const key = asset.tokenId ?? asset.chain
        assetsObj[key] = { ...(state?.assets[key] ? state?.assets[key] : {}), ...asset }
      })
      return assetsObj
    } catch (error) {
      console.error(error)
      return {}
    }
  }
)

const initialState = {} as AssetsState

export const assets = createSlice({
  name: 'asset',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchAsset.fulfilled, (state, { payload, meta }) => {
        const tokenId = meta.arg.tokenId ?? meta.arg.chain
        if (payload[tokenId]) {
          state[tokenId] = payload[tokenId]
        }
      })
      .addCase(fetchAssets.fulfilled, (state, { payload }) => {
        Object.keys(payload).forEach(key => {
          state[key] = payload[key]
        })
      })
  }
})
