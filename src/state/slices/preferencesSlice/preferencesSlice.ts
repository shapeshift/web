import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { getAssetService } from 'lib/assetService'
import { ReduxState } from 'state/reducer'

export type FullAsset = Asset & { description?: string }
export type AssetsState = { [key: string]: Asset & { description?: string } }

const initialState = {} as AssetsState

export const preferences = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setPreference(state, { payload }) {
      state[payload.key] = payload.value
    }
  }
})
