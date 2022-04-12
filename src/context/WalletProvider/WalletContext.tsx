import React, { createContext } from 'react'

import { ActionTypes } from './actions'
import { KeyManager } from './KeyManager'
import type { InitialState, Outcome } from './WalletProvider'

export interface IWalletContext {
  state: InitialState
  dispatch: React.Dispatch<ActionTypes>
  connect: (adapter: KeyManager) => Promise<void>
  create: (adapter: KeyManager) => Promise<void>
  disconnect: () => void
  load: () => void
  setAwaitingDeviceInteraction: (awaitingDeviceInteraction: boolean) => void
  setLastDeviceInteractionStatus: (lastDeviceInteractionStatus: Outcome | undefined) => void
}

export const WalletContext = createContext<IWalletContext | null>(null)
