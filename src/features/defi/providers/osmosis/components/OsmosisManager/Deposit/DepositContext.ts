import { createContext } from 'react'

import type { OsmosisDepositActions, OsmosisDepositState } from './DepositCommon'

interface IDepositContext {
  state: OsmosisDepositState | null
  dispatch: React.Dispatch<OsmosisDepositActions> | null
}

export const DepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
