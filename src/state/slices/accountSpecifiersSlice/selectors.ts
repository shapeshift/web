import { ReduxState } from 'state/reducer'

export const selectAccountSpecifiers = (state: ReduxState) =>
  state.accountSpecifiers.accountSpecifiers
