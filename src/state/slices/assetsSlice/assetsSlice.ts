import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { getAssetService, service } from 'lib/assetService'

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
      if (!service) await getAssetService()

      const assetData = service?.byTokenId({ chain, network, tokenId })
      const description = await service?.description(chain, tokenId)
      if (!assetData) return {}
      if (!description) return { [tokenId || chain]: assetData }
      return { [tokenId || chain]: { ...assetData, description } }
    } catch (error) {
      console.error(error, 'error')
      return {}
    }
  }
)

const initialState = {} as { [key: string]: Asset & { description?: string } }

export const assets = createSlice({
  name: 'asset',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchAsset.fulfilled, (state, { payload, meta }) => {
      const tokenId = meta.arg.tokenId ?? meta.arg.chain
      if (payload[tokenId]) {
        state[tokenId] = payload[tokenId]
      }
    })
  }
})
