import type { ChainId } from '@keepkey/caip'
import { createSlice } from '@reduxjs/toolkit'
import isEqual from 'lodash/isEqual'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['accountSpecifiersSlice'] })

// an account specifier is an x/y/zpub, or eth public key
// as consumed by unchained, note this is *not* an AccountId
// as we're dealing with unchained accounts, not addresses
export type AccountSpecifier = string
export type AccountSpecifierMap = Record<ChainId, AccountSpecifier>

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
      moduleLogger.info('clearing account specifiers')
      return getInitialState()
    },
    upsertAccountSpecifiers(state, { payload }: { payload: AccountSpecifierMap[] }) {
      // don't set to exactly the same thing and cause renders
      if (isEqual(state.accountSpecifiers, payload)) return
      moduleLogger.info('upserting account specifiers')
      state.accountSpecifiers = [...state.accountSpecifiers, ...payload]
    },
  },
})
