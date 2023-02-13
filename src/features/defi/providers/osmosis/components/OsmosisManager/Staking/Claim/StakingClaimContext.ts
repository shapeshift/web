import { createContext } from 'react'

import type { OsmosisStakingClaimActions, OsmosisStakingClaimState } from './StakingClaimCommon'

export interface IClaimContext {
  state: OsmosisStakingClaimState | null
  dispatch: React.Dispatch<OsmosisStakingClaimActions> | null
}

export const StakingClaimContext = createContext<IClaimContext>({ state: null, dispatch: null })
