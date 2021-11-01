import { UtxoAccountType } from '@shapeshiftoss/types'
import { useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { accountTypePrefix } from 'state/slices/preferencesSlice/preferencesSlice'

export function useAllAccountTypes(): { [key: string]: UtxoAccountType } {
  return useSelector((state: ReduxState) =>
    Object.entries(state.preferences).reduce(
      (acc, val) =>
        val[0].startsWith(accountTypePrefix) ? { ...acc, [val[0]]: val[1] } : { ...acc },
      {}
    )
  )
}
