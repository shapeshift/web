import { createContext } from 'react'

import type { IdleClaimActions, IdleClaimState } from './ClaimCommon'
import { initialState } from './ClaimReducer'

interface IClaimContext {
  state: IdleClaimState
  dispatch: React.Dispatch<IdleClaimActions> | null
}

export const ClaimContext = createContext<IClaimContext>({ state: initialState, dispatch: null })
