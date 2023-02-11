import { createContext } from 'react'

import type {
  OsmosisStakingWithdrawActions,
  OsmosisStakingWithdrawState,
} from './StakingWithdrawCommon'

interface IWithdrawContext {
  state: OsmosisStakingWithdrawState | null
  dispatch: React.Dispatch<OsmosisStakingWithdrawActions> | null
}

export const StakingWithdrawContext = createContext<IWithdrawContext>({
  state: null,
  dispatch: null,
})
