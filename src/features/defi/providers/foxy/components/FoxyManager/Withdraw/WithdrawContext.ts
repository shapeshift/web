import { createContext } from 'react'

import { FoxyWithdrawActions, FoxyWithdrawState } from './WithdrawCommon'

interface IWithdrawContext {
  state: FoxyWithdrawState | null
  dispatch: React.Dispatch<FoxyWithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
