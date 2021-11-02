import { createSelector } from '@reduxjs/toolkit'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { accountTypePrefix } from 'state/slices/preferencesSlice/preferencesSlice'

export const selectAllAccountTypes = createSelector(
  (state: ReduxState) => state.preferences,
  preferences =>
    Object.entries(preferences).reduce(
      (acc, val) =>
        val[0].startsWith(accountTypePrefix) ? { ...acc, [val[0]]: val[1] } : { ...acc },
      {}
    )
)

export function useAllAccountTypes(): { [key: string]: UtxoAccountType } {
  return useSelector(selectAllAccountTypes)
}
