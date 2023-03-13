import type { SwapperAction, SwapperState } from 'components/Trade/SwapperProvider/types'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'

export const swapperReducer = (state: SwapperState, action: SwapperAction): SwapperState => {
  switch (action.type) {
    case SwapperActionType.SET_VALUES:
      return { ...state, ...action.payload }
    case SwapperActionType.TOGGLE_IS_EXACT_ALLOWANCE:
      return { ...state, isExactAllowance: !state.isExactAllowance }
    default:
      return state
  }
}
