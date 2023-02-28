import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { Dispatch, FC, PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useReducer } from 'react'
import type { TradeAsset } from 'components/Trade/types'

export type SwapperState<C extends ChainId = ChainId> = {
  receiveAddress?: string
  quote?: TradeQuote<C>
  buyTradeAsset?: TradeAsset
  sellTradeAsset?: TradeAsset
}
export enum SwapperActionType {
  SET_VALUES = 'SET_VALUES',
  SET_RECEIVE_ADDRESS = 'SET_RECEIVE_ADDRESS',
  SET_QUOTE = 'SET_QUOTE',
  CLEAR_AMOUNTS = 'CLEAR_AMOUNTS',
  SET_BUY_ASSET = 'SET_BUY_ASSET',
  SET_SELL_ASSET = 'SET_SELL_ASSET',
  SET_TRADE_AMOUNTS = 'SET_TRADE_AMOUNTS',
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
  | { type: SwapperActionType.CLEAR_AMOUNTS }
  | {
      type: SwapperActionType.SET_BUY_ASSET | SwapperActionType.SET_SELL_ASSET
      payload: Asset | undefined
    }
  | {
      type: SwapperActionType.SET_TRADE_AMOUNTS
      payload: {
        buyAmountCryptoPrecision?: string
        sellAmountCryptoPrecision?: string
      }
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
    case SwapperActionType.SET_BUY_ASSET:
    case SwapperActionType.SET_SELL_ASSET:
      const actionKey =
        action.type === SwapperActionType.SET_BUY_ASSET ? 'buyTradeAsset' : 'sellTradeAsset'
      return {
        ...state,
        [actionKey]: {
          ...state[actionKey],
          asset: action.payload,
        },
      }
    case SwapperActionType.SET_TRADE_AMOUNTS:
      const buyAmountCryptoPrecision = action.payload.buyAmountCryptoPrecision
      const sellAmountCryptoPrecision = action.payload.sellAmountCryptoPrecision
      return {
        ...state,
        buyTradeAsset: {
          ...state.buyTradeAsset,
          ...(() =>
            buyAmountCryptoPrecision ? { amountCryptoPrecision: buyAmountCryptoPrecision } : {})(),
        },
        sellTradeAsset: {
          ...state.sellTradeAsset,
          ...(() =>
            sellAmountCryptoPrecision
              ? { amountCryptoPrecision: sellAmountCryptoPrecision }
              : {})(),
        },
      }
    case SwapperActionType.CLEAR_AMOUNTS:
      return {
        ...state,
        buyTradeAsset: {
          ...state.buyTradeAsset,
          amountCryptoPrecision: '',
        },
        sellTradeAsset: {
          ...state.sellTradeAsset,
          amountCryptoPrecision: '',
        },
      }
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
  // all services would go here, and receive the dispatch function and state
  return <SwapperContext.Provider value={value}>{children}</SwapperContext.Provider>
}
