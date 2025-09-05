// window.d.ts
import type { Store } from 'redux'

import type { ReduxState } from './state/reducer'

declare global {
  interface Window {
    store: Store<ReduxState>
    __adrsbl?: {
      queue: unknown[]
      run: (...args: unknown[]) => void
    }
  }
}
