import { createContext } from 'react'

import type { RunePoolDepositActions, RunePoolDepositState } from './DepositCommon'

interface IDepositContext {
  state: RunePoolDepositState | null
  dispatch: React.Dispatch<RunePoolDepositActions> | null
}

export const DepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
