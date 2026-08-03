import { createContext } from 'react'

import type { RunePoolWithdrawActions, RunePoolWithdrawState } from './WithdrawCommon'

interface IWithdrawContext {
  state: RunePoolWithdrawState | null
  dispatch: React.Dispatch<RunePoolWithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
