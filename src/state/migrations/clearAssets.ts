import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { initialState } from 'state/slices/assetsSlice/assetsSlice'

export const clearAssets = (_state: AssetsState): AssetsState & PersistPartial => {
  return initialState as AssetsState & PersistPartial
}
