import type { CowTrade, Trade } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Dispatch } from 'react'
import type { DisplayFeeData } from 'components/Trade/types'

export type SwapperState<C extends KnownChainIds = KnownChainIds> = {
  fees?: DisplayFeeData<C>
  trade?: Trade<C> | CowTrade<C>
}

export enum SwapperActionType {
  SET_VALUES = 'SET_VALUES',
}

export type SwapperAction = {
  type: SwapperActionType.SET_VALUES
  payload: Partial<SwapperState>
}

export type SwapperContextType<T extends KnownChainIds = KnownChainIds> = {
  state: SwapperState<T>
  dispatch: Dispatch<SwapperAction>
}
