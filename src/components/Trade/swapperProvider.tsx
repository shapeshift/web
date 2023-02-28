import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { CowTrade, Trade, TradeQuote } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import type { Context, Dispatch, FC, PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useReducer } from 'react'
import type { DisplayFeeData, TradeAsset } from 'components/Trade/types'
import { TradeAmountInputField } from 'components/Trade/types'

export type SwapperState<C extends KnownChainIds = KnownChainIds> = {
  receiveAddress?: string
  quote?: TradeQuote<C>
  buyTradeAsset?: TradeAsset
  sellTradeAsset?: TradeAsset
  sellAssetAccountId?: AccountId | undefined
  buyAssetAccountId?: AccountId | undefined
  selectedSellAssetAccountId?: AccountId
  selectedBuyAssetAccountId?: AccountId
  fiatSellAmount?: string
  fiatBuyAmount?: string
  sellAssetFiatRate?: string
  buyAssetFiatRate?: string
  feeAssetFiatRate?: string
  fees?: DisplayFeeData<C>
  trade?: Trade<C> | CowTrade<C>
  action?: TradeAmountInputField | undefined
  isExactAllowance?: boolean
  slippage: string
  isSendMax: boolean
  amount: string
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
        fiatSellAmount?: string
        fiatBuyAmount?: string
      }
    }

export type SwapperContextType<T extends KnownChainIds = KnownChainIds> = {
  state: SwapperState<T>
  dispatch: Dispatch<SwapperAction>
}

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
      const fiatSellAmount = action.payload.fiatSellAmount
      const fiatBuyAmount = action.payload.fiatBuyAmount
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
        ...(() => (fiatSellAmount ? { fiatSellAmount } : {}))(),
        ...(() => (fiatBuyAmount ? { fiatBuyAmount } : {}))(),
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

const SwapperContext = createContext<SwapperContextType | undefined>(undefined)

export function useSwapperState<T extends KnownChainIds = KnownChainIds>() {
  const context = useContext<SwapperContextType<T> | undefined>(
    SwapperContext as Context<SwapperContextType<T> | undefined>,
  )
  if (context === undefined) {
    throw new Error('useSwapperState must be used within a SwapperProvider')
  }

  return { ...context.state, dispatch: context.dispatch }
}

export const SwapperProvider: FC<PropsWithChildren> = ({ children }) => {
  const initialState: SwapperState = {
    amount: '0',
    isExactAllowance: false,
    slippage: DEFAULT_SLIPPAGE,
    action: TradeAmountInputField.SELL_CRYPTO,
    isSendMax: false,
    sellTradeAsset: { amountCryptoPrecision: '0' },
    buyTradeAsset: { amountCryptoPrecision: '0' },
    fiatSellAmount: '0',
    fiatBuyAmount: '0',
  }
  const [state, dispatch] = useReducer(swapperReducer, initialState)

  const value: SwapperContextType = useMemo(() => ({ state, dispatch }), [state])
  // all services would go here, and receive the dispatch function and state
  return <SwapperContext.Provider value={value}>{children}</SwapperContext.Provider>
}
