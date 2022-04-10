import { createContext } from 'react'

import { FoxyDepositActions, FoxyDepositState } from './DepositReducer'

export interface IDepositContext {
  state: FoxyDepositState | null
  dispatch: React.Dispatch<FoxyDepositActions> | null
}

export const DepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
