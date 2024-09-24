import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { Portfolio } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { initialState } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export const clearPortfolio = (_state: Portfolio): Portfolio & PersistPartial => {
  return initialState as Portfolio & PersistPartial
}
