import { createContext } from 'react'

import { YearnWithdrawActions, YearnWithdrawState } from './WithdrawReducer'

export interface IWithdrawContext {
  state: YearnWithdrawState | null
  dispatch: React.Dispatch<YearnWithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
