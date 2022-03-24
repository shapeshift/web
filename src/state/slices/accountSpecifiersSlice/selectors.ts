import { ReduxState } from 'state/reducer'

export const selectAccountSpecifiers = (state: ReduxState) =>
  state.accountSpecifiers.accountSpecifiers

// returns an array of the full `caip2:pubkeyish` type, as used in URLs for account pages
export const selectAccountSpecifierStrings = (state: ReduxState) =>
  state.accountSpecifiers.accountSpecifiers.map(accountSpecifier =>
    Object.entries(accountSpecifier)[0].join(':').toLowerCase()
  )
