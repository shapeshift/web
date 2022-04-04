import { createContext } from 'react'

import { ActionTypes } from './actions'
import { KeyManager } from './KeyManager'
import type { InitialState } from './WalletProvider'

export interface IWalletContext {
  state: InitialState
  dispatch: React.Dispatch<ActionTypes>
  connect: (adapter: KeyManager) => Promise<void>
  create: (adapter: KeyManager) => Promise<void>
  disconnect: () => void
}

export const WalletContext = createContext<IWalletContext | null>(null)
