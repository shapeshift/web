import { createSlice } from '@reduxjs/toolkit'
import { CAIP2 } from '@shapeshiftoss/caip'
import isEqual from 'lodash/isEqual'

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
    clear: () => {
      console.info('accountSpecifiersSlice: clearing account specifiers')
      return getInitialState()
    },
    setAccountSpecifiers(state, { payload }: { payload: AccountSpecifierMap[] }) {
      // don't set to exactly the same thing and cause renders
      if (isEqual(state.accountSpecifiers, payload)) return
      console.info('accountSpecifiersSlice: dispatching account specifiers set action')
      state.accountSpecifiers = payload
    },
  },
})
