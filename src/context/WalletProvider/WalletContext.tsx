import type React from 'react'
import { createContext } from 'react'

import type { ActionTypes } from './actions'
import type { KeyManager } from './KeyManager'
import type { DeviceState, InitialState } from './WalletProvider'

export interface IWalletContext {
  state: InitialState
  dispatch: React.Dispatch<ActionTypes>
  create: (adapter: KeyManager) => Promise<void>
  disconnect: () => void
  load: () => void
  setDeviceState: (deviceState: Partial<DeviceState>) => void
  isUpdatingKeepkey: boolean
  setIsUpdatingKeepkey: any
  pairAndConnect: any
  deviceBusy: boolean
}

export const WalletContext = createContext<IWalletContext | null>(null)
