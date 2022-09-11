import { createContext } from 'react'

import type { FoxFarmingWithdrawActions, FoxFarmingWithdrawState } from './WithdrawCommon'

interface IWithdrawContext {
  state: FoxFarmingWithdrawState | null
  dispatch: React.Dispatch<FoxFarmingWithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
