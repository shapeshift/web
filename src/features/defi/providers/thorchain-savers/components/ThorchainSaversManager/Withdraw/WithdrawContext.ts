import { createContext } from 'react'

import type { ThorchainSaversWithdrawActions, ThorchainSaversWithdrawState } from './WithdrawCommon'

interface IWithdrawContext {
  state: ThorchainSaversWithdrawState | null
  dispatch: React.Dispatch<ThorchainSaversWithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
