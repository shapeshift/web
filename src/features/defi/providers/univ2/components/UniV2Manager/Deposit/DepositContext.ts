import { createContext } from 'react'

import type { UniV2DepositActions, UniV2DepositState } from './DepositCommon'

interface IDepositContext {
  state: UniV2DepositState | null
  dispatch: React.Dispatch<UniV2DepositActions> | null
}

export const DepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
