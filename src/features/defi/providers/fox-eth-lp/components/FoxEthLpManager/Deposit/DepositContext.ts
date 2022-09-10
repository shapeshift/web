import { createContext } from 'react'

import type { FoxEthLpDepositActions, FoxEthLpDepositState } from './DepositCommon'

interface IDepositContext {
  state: FoxEthLpDepositState | null
  dispatch: React.Dispatch<FoxEthLpDepositActions> | null
}

export const DepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
