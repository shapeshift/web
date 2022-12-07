import { createContext } from 'react'

import type { IdleDepositActions, IdleDepositState } from './DepositCommon'

interface IDepositContext {
  state: IdleDepositState | null
  dispatch: React.Dispatch<IdleDepositActions> | null
}

export const DepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
