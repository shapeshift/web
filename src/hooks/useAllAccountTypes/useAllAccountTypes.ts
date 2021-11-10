import { createSelector } from '@reduxjs/toolkit'
import { useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'

export const selectAllAccountTypes = createSelector(
  (state: ReduxState) => state.preferences.accountTypes,
  accountTypes => accountTypes
)

export function useAllAccountTypes() {
  return useSelector(selectAllAccountTypes)
}
