// window.d.ts
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { Store } from 'redux'

import type { ReduxState } from './state/reducer'

declare global {
  interface Window {
    store: Store<ReduxState>
    reparseSecondClassChainTx?: (args: {
      chainId: ChainId
      txHash: string
      accountId: AccountId
    }) => Promise<void>
    HypeLabAnalytics?: {
      logEvent: (...args: unknown[]) => void
      setWalletAddresses: (w: string[]) => void
      setClient?: (client: unknown) => void
      Client?: new (config: unknown) => unknown
    }
    __hype_analytics?: unknown[]
    __hype_wids?: string[]
  }
}
