import type React from 'react'
import { createContext } from 'react'

import type { ActionTypes } from './actions'
import type { KeyManager } from './KeyManager'
import type { GetAdapter } from './types'
import type { DeviceState, InitialState } from './WalletProvider'

export interface IWalletContext {
  state: InitialState
  getAdapter: GetAdapter
  dispatch: React.Dispatch<ActionTypes>
  connect: (adapter: KeyManager | string, isMipdProvider: boolean) => void
  create: (adapter: KeyManager) => void
  importWallet: (adapter: KeyManager) => void
  disconnect: () => void
  load: () => void
  setDeviceState: (deviceState: Partial<DeviceState>) => void
  connectDemo: () => Promise<void>
}

export const WalletContext = createContext<IWalletContext | null>(null)
