import { createSlice } from '@reduxjs/toolkit'
import { ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { ReduxState } from 'state/reducer'

export type Preferences = {
  accountTypes: Record<string, any>
}

export const supportedAccountTypes = {
  [ChainTypes.Bitcoin]: [
    UtxoAccountType.SegwitNative,
    UtxoAccountType.SegwitP2sh,
    UtxoAccountType.P2pkh
  ],
  [ChainTypes.Ethereum]: undefined
}

const initialState: Preferences = {
  // TODO(0xdef1cafe): this whole thing needs to be deleted once we have the account -> address abstraction
  accountTypes: {
    [ChainTypes.Bitcoin]: UtxoAccountType.SegwitNative
  }
}

export const preferences = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setAccountType(state, { payload }: { payload: { key: ChainTypes; value: any } }) {
      state.accountTypes[payload.key] = payload.value
    }
  }
})

export const selectAccountTypes = (state: ReduxState) => state.preferences.accountTypes
