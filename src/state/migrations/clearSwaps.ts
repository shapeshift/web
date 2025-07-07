import type { PersistPartial } from 'redux-persist/es/persistReducer'

import { initialState } from '../slices/swapSlice/swapSlice'
import type { SwapState } from '../slices/swapSlice/types'

export const clearSwaps = (_state: SwapState): SwapState & PersistPartial => {
  // Migration to clear swaps state
  return initialState as SwapState & PersistPartial
}
