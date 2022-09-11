import { createContext } from 'react'

import type { FoxyWithdrawActions, FoxyWithdrawState } from './WithdrawCommon'

interface IWithdrawContext {
  state: FoxyWithdrawState | null
  dispatch: React.Dispatch<FoxyWithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
