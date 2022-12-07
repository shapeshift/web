import { createContext } from 'react'

import type { FoxEthLpWithdrawActions, FoxEthLpWithdrawState } from './WithdrawCommon'

interface IWithdrawContext {
  state: FoxEthLpWithdrawState | null
  dispatch: React.Dispatch<FoxEthLpWithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
