import { createContext } from 'react'
import { initialState } from './ClaimReducer'
import { IdleClaimActions, IdleClaimState } from './ClaimCommon'

interface IClaimContext {
  state: IdleClaimState
  dispatch: React.Dispatch<IdleClaimActions> | null
}

export const ClaimContext = createContext<IClaimContext>({ state: initialState, dispatch: null })
