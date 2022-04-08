import { createSlice } from '@reduxjs/toolkit'
import { CAIP2 } from '@shapeshiftoss/caip'

// an account specifier is an x/y/zpub, or eth public key
// as consumed by unchained, note this is *not* a CAIP10
// as we're dealing with unchained accounts, not addresses
export type AccountSpecifier = string
export type AccountSpecifierMap = Record<CAIP2, AccountSpecifier>

type AccountSpecifierState = {
  accountSpecifiers: AccountSpecifierMap[]
}

const getInitialState = (): AccountSpecifierState => ({
  accountSpecifiers: [],
})

export const accountSpecifiers = createSlice({
  name: 'accountSpecifiers',
  initialState: getInitialState(),
  reducers: {
    clear: getInitialState,
    setAccountSpecifiers(state, { payload }: { payload: AccountSpecifierMap[] }) {
      state.accountSpecifiers = payload
    },
  },
})
