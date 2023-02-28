import type { ChainId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { Dispatch, FC, PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useReducer } from 'react'

export type SwapperState<C extends ChainId = ChainId> = {
  receiveAddress?: string
  quote?: TradeQuote<C>
}
export enum SwapperActionType {
  SET_VALUES = 'SET_VALUES',
  SET_RECEIVE_ADDRESS = 'SET_RECEIVE_ADDRESS',
  SET_QUOTE = 'SET_QUOTE',
}

export type SwapperAction =
  | {
      type: SwapperActionType.SET_VALUES
      payload: Partial<SwapperState>
    }
  | {
      type: SwapperActionType.SET_RECEIVE_ADDRESS
      payload: string | undefined
    }
  | {
      type: SwapperActionType.SET_QUOTE
      payload: TradeQuote<ChainId> | undefined
    }

export type SwapperContextType = {
  state: SwapperState
  dispatch: Dispatch<SwapperAction>
}

const SwapperContext = createContext<SwapperContextType | undefined>(undefined)

export const swapperReducer = (state: SwapperState, action: SwapperAction): SwapperState => {
  switch (action.type) {
    case SwapperActionType.SET_VALUES:
      return { ...state, ...action.payload }
    case SwapperActionType.SET_RECEIVE_ADDRESS:
      return { ...state, receiveAddress: action.payload }
    case SwapperActionType.SET_QUOTE:
      return { ...state, quote: action.payload }
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
  console.log('xxx swapper state', state)
  // all services would go here, and receive the dispatch function and state
  return <SwapperContext.Provider value={value}>{children}</SwapperContext.Provider>
}
