import { createContext } from 'react'

import { IdleClaimActions, IdleClaimState } from './ClaimCommon'

interface IClaimContext {
  state: IdleClaimState | null
  dispatch: React.Dispatch<IdleClaimActions> | null
}

export const ClaimContext = createContext<IClaimContext>({ state: null, dispatch: null })
