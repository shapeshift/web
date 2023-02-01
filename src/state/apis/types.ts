import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import type { Preferences } from 'state/slices/preferencesSlice/preferencesSlice'

export type State = {
  assets: AssetsState
  preferences: Preferences
}
