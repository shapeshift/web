import { createSlice } from '@reduxjs/toolkit'
import { ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'

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
  accountTypes: {
    [ChainTypes.Bitcoin]: UtxoAccountType.SegwitP2sh
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
