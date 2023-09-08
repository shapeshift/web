// window.d.ts
import type { Store } from 'redux'

declare global {
  interface Window {
    store: Store<ReduxState, AppDispatch>
  }
}
