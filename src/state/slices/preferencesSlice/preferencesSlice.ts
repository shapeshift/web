import { createSlice } from '@reduxjs/toolkit'
import { ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'

export const accountTypePrefix = 'accountType_'

const initialState = {
  [accountTypePrefix + ChainTypes.Bitcoin]: UtxoAccountType.SegwitP2sh
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

export const getAccountTypeKey = (chain: ChainTypes) => {
  return accountTypePrefix + chain
}
