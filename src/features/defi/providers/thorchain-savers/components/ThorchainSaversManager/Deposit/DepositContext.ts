import { createContext } from 'react'

import type { ThorchainSaversDepositActions, ThorchainSaversDepositState } from './DepositCommon'

interface IDepositContext {
  state: ThorchainSaversDepositState | null
  dispatch: React.Dispatch<ThorchainSaversDepositActions> | null
}

export const DepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
