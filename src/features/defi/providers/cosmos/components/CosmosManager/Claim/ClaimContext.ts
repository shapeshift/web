import { createContext } from 'react'

import type { CosmosClaimActions, CosmosClaimState } from './ClaimCommon'

export interface IClaimContext {
  state: CosmosClaimState | null
  dispatch: React.Dispatch<CosmosClaimActions> | null
}

export const ClaimContext = createContext<IClaimContext>({ state: null, dispatch: null })
