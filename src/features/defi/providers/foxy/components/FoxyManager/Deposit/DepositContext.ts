import { createContext } from 'react'

import type { FoxyDepositActions, FoxyDepositState } from './DepositCommon'

export interface IDepositContext {
  state: FoxyDepositState | null
  dispatch: React.Dispatch<FoxyDepositActions> | null
}

export const DepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
