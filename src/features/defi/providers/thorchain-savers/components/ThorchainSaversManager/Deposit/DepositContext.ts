import { createContext } from 'react'

import type { YearnDepositActions, YearnDepositState } from './DepositCommon'

interface IDepositContext {
  state: YearnDepositState | null
  dispatch: React.Dispatch<YearnDepositActions> | null
}

export const DepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
