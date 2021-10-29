import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { scriptTypePrefix } from 'state/slices/preferencesSlice/preferencesSlice'

export function useAllScriptTypes(): { [key: string]: BTCInputScriptType } {
  return useSelector((state: ReduxState) =>
    Object.entries(state.preferences).reduce(
      (acc, val) =>
        val[0].startsWith(scriptTypePrefix) ? { ...acc, [val[0]]: val[1] } : { ...acc },
      {}
    )
  )
}
