import { createContext, useCallback, useContext, useEffect, useReducer } from 'react'
import { useHistory, useLocation } from 'react-router-dom'

import { TradeInputTab, TradeRoutePaths } from '../types'

import { assertUnreachable } from '@/lib/utils'

// Define action types
type MultiHopTradeAction =
  | { type: 'SET_ACTIVE_TAB'; payload: TradeInputTab }

// Define the state type
type MultiHopTradeState = {
  activeTab: TradeInputTab
}

// Define the context type
type MultiHopTradeContextType = MultiHopTradeState & {
  handleChangeTab: (newTab: TradeInputTab) => void
}

// Create the initial state
const initialState: MultiHopTradeState = {
  activeTab: TradeInputTab.Trade
}

// Create the reducer function
export const multiHopTradeReducer = (
  state: MultiHopTradeState,
  action: MultiHopTradeAction,
): MultiHopTradeState => {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload
      }
    default:
      return state
  }
}

// Create the context
const MultiHopTradeContext = createContext<MultiHopTradeContextType | undefined>(undefined)

export const MultiHopTradeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const history = useHistory()
  const location = useLocation()
  const [state, dispatch] = useReducer(multiHopTradeReducer, initialState)

  // Sync the active tab with the current route
  useEffect(() => {
    if (location.pathname === TradeRoutePaths.Claim) {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: TradeInputTab.Claim })
    } else if (location.pathname === TradeRoutePaths.LimitOrder) {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: TradeInputTab.LimitOrder })
    } else if (
      location.pathname === TradeRoutePaths.Input ||
      location.pathname === TradeRoutePaths.Confirm ||
      location.pathname === TradeRoutePaths.VerifyAddresses ||
      location.pathname === TradeRoutePaths.QuoteList
    ) {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: TradeInputTab.Trade })
    }
  }, [location.pathname])

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      // Update the active tab state
      dispatch({ type: 'SET_ACTIVE_TAB', payload: newTab })
      
      // Navigate to the corresponding route
      switch (newTab) {
        case TradeInputTab.Trade:
          history.push(TradeRoutePaths.Input)
          break
        case TradeInputTab.LimitOrder:
          history.push(TradeRoutePaths.LimitOrder)
          break
        case TradeInputTab.Claim:
          history.push(TradeRoutePaths.Claim)
          break
        default:
          assertUnreachable(newTab)
      }
    },
    [history]
  )

  const value = {
    ...state,
    handleChangeTab
  }

  return <MultiHopTradeContext.Provider value={value}>{children}</MultiHopTradeContext.Provider>
}

export const useMultiHopTradeContext = () => {
  const context = useContext(MultiHopTradeContext)
  if (context === undefined) {
    throw new Error('useMultiHopTradeContext must be used within MultiHopTradeProvider')
  }
  return context
}
