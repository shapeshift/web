import React, { createContext } from 'react'

import { ActionTypes, Outcome } from './actions'
import { KeyManager } from './KeyManager'
import type { InitialState } from './WalletProvider'

export interface IWalletContext {
  state: InitialState
  dispatch: React.Dispatch<ActionTypes>
  connect: (adapter: KeyManager) => Promise<void>
  create: (adapter: KeyManager) => Promise<void>
  disconnect: () => void
  load: () => void
  setAwaitingDeviceInteraction: (awaitingDeviceInteraction: boolean) => void
  setLastDeviceInteractionStatus: (lastDeviceInteractionStatus: Outcome) => void
}

export const WalletContext = createContext<IWalletContext | null>(null)
