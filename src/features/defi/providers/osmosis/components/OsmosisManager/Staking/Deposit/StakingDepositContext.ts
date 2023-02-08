import { createContext } from 'react'

import type {
  OsmosisStakingDepositActions,
  OsmosisStakingDepositState,
} from './StakingDepositCommon'

export interface IDepositContext {
  state: OsmosisStakingDepositState | null
  dispatch: React.Dispatch<OsmosisStakingDepositActions> | null
}

export const StakingDepositContext = createContext<IDepositContext>({ state: null, dispatch: null })
