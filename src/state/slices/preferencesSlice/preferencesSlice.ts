import { createSlice } from '@reduxjs/toolkit'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'

export const scriptTypePrefix = 'scriptType_'

const initialState = {
  [scriptTypePrefix + ChainTypes.Bitcoin]: BTCInputScriptType.SpendP2SHWitness
} as { [key: string]: any }

export const preferences = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setPreference(state, { payload }) {
      state[payload.key] = payload.value
    }
  }
})

export const getScriptTypeKey = (chain: ChainTypes) => {
  return scriptTypePrefix + chain
}
