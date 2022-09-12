import { createContext } from 'react'

import type { CosmosWithdrawActions, CosmosWithdrawState } from './WithdrawCommon'

interface IWithdrawContext {
  state: CosmosWithdrawState | null
  dispatch: React.Dispatch<CosmosWithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
