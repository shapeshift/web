import { createSlice } from '@reduxjs/toolkit'

export type AccountSpecifier = Record<string, string>

type AccountSpecifierState = {
  accountSpecifiers: AccountSpecifier[]
}

const getInitialState = (): AccountSpecifierState => ({
  accountSpecifiers: []
})

export const accountSpecifiers = createSlice({
  name: 'accountSpecifiers',
  initialState: getInitialState(),
  reducers: {
    clear: getInitialState,
    setAccountSpecifiers(state, { payload }: { payload: AccountSpecifier[] }) {
      state.accountSpecifiers = payload
    }
  }
})
