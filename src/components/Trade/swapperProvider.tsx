import type { Dispatch, FC, PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useReducer } from 'react'

export type SwapperState = {
  receiveAddress?: string
}
export enum SwapperActionType {
  SET_RECEIVE_ADDRESS = 'SET_RECEIVE_ADDRESS',
}

export type SwapperAction = {
  type: SwapperActionType.SET_RECEIVE_ADDRESS
  payload: string | undefined
}

export type SwapperContextType = {
  state: SwapperState
  dispatch: Dispatch<SwapperAction>
}

const SwapperContext = createContext<SwapperContextType | undefined>(undefined)

export const swapperReducer = (state: SwapperState, action: SwapperAction): SwapperState => {
  switch (action.type) {
    case SwapperActionType.SET_RECEIVE_ADDRESS:
      return { ...state, receiveAddress: action.payload }
    default:
      return state
  }
}

export function useSwapperState() {
  const context = useContext(SwapperContext)
  if (context === undefined) {
    throw new Error('useSwapperState must be used within a SwapperProvider')
  }

  return { ...context.state, dispatch: context.dispatch }
}

export const SwapperProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(swapperReducer, {})

  const value: SwapperContextType = useMemo(() => ({ state, dispatch }), [state])
  return <SwapperContext.Provider value={value}>{children}</SwapperContext.Provider>
}
