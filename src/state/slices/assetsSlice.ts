import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { AssetService } from '@shapeshiftoss/asset-service'
import { Asset } from '@shapeshiftoss/types'

const service = new AssetService('')

export const fetchAsset = createAsyncThunk(
  'asset/fetchAsset',
  async ({ tokenId, chain, network }: { tokenId?: string; chain: string; network: string }) => {
    try {
      !service.isInitialized && (await service.initialize())
      const assetData: Asset | undefined = await service.byTokenId({ chain, network, tokenId })
      const description = await service.description(chain, tokenId)
      if (!assetData) return {}
      return { [tokenId || chain]: { ...assetData, description } }
    } catch (error) {
      console.error(error, 'error')
      return {}
    }
  }
)

const initialState = {} as { [key: string]: Asset & { description: string | null } }

export const assets = createSlice({
  name: 'asset',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchAsset.fulfilled, (state, { payload, meta }) => {
      const tokenId = meta.arg.tokenId ?? meta.arg.chain
      state[tokenId] = payload[tokenId]
    })
  }
})
