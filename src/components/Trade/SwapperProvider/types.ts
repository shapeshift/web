import type { CowTrade, Trade } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Dispatch } from 'react'
import type { DisplayFeeData, TradeAmountInputField } from 'components/Trade/types'

export type SwapperState<C extends KnownChainIds = KnownChainIds> = {
  receiveAddress?: string
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
  TOGGLE_IS_EXACT_ALLOWANCE = 'TOGGLE_IS_EXACT_ALLOWANCE',
}

export type SwapperAction =
  | {
      type: SwapperActionType.SET_VALUES
      payload: Partial<SwapperState>
    }
  | { type: SwapperActionType.TOGGLE_IS_EXACT_ALLOWANCE }

export type SwapperContextType<T extends KnownChainIds = KnownChainIds> = {
  state: SwapperState<T>
  dispatch: Dispatch<SwapperAction>
}
