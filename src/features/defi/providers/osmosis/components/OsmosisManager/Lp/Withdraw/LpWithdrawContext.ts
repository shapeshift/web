import { createContext } from 'react'

import type { OsmosisWithdrawActions, OsmosisWithdrawState } from './LpWithdrawCommon'

interface IWithdrawContext {
  state: OsmosisWithdrawState | null
  dispatch: React.Dispatch<OsmosisWithdrawActions> | null
}

export const WithdrawContext = createContext<IWithdrawContext>({ state: null, dispatch: null })
