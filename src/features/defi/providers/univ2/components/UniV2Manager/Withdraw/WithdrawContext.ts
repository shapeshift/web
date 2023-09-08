import { createContext } from 'react'

import type { UniV2WithdrawActions, UniV2WithdrawState } from './WithdrawCommon'

interface IWithdrawContext {
  state: UniV2WithdrawState | null
  dispatch: React.Dispatch<UniV2WithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
