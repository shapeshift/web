import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import type { Preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import type { TxHistory } from 'state/slices/txHistorySlice/txHistorySlice'

export type State = {
  assets: AssetsState
  preferences: Preferences
  txHistory: TxHistory
}
