import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type React from 'react'
import { createContext } from 'react'

import type { ActionTypes } from './actions'
import type { KeyManager } from './KeyManager'
import type { GetAdapter } from './types'
import type { DeviceState, InitialState, KeyManagerWithProvider } from './WalletProvider'

export interface IWalletContext {
  state: InitialState
  getAdapter: GetAdapter
  dispatch: React.Dispatch<ActionTypes>
  connect: (adapter: KeyManager, isMipdProvider: boolean) => void
  create: (adapter: KeyManager) => void
  importWallet: (adapter: KeyManager) => void
  disconnect: () => void
  load: () => void
  setDeviceState: (deviceState: Partial<DeviceState>) => void
  connectDemo: () => Promise<void>
  onProviderChange: (
    localWalletType: KeyManagerWithProvider,
    wallet: HDWallet | null,
  ) => Promise<InitialState['provider'] | undefined>
}

export const WalletContext = createContext<IWalletContext | null>(null)
