import type { HDWallet } from '@shapeshiftoss/hdwallet-core'

import type { PinMatrixRequestType } from './KeepKey/KeepKeyTypes'
import type { KeyManager } from './KeyManager'
import type { AdaptersByKeyManager } from './types'
import type { DeviceState, InitialState, WalletInfo } from './WalletProvider'

export enum WalletActions {
  SET_ADAPTERS = 'SET_ADAPTERS',
  SET_WALLET = 'SET_WALLET',
  SET_CONNECTOR_TYPE = 'SET_CONNECTOR_TYPE',
  SET_INITIAL_ROUTE = 'SET_INITIAL_ROUTE',
  SET_IS_CONNECTED = 'SET_IS_CONNECTED',
  SET_WCV2_PROVIDER = 'SET_WCV2_PROVIDER',
  SET_IS_LOCKED = 'SET_IS_LOCKED',
  SET_WALLET_MODAL = 'SET_WALLET_MODAL',
  RESET_STATE = 'RESET_STATE',
  RESET_LAST_DEVICE_INTERACTION_STATE = 'RESET_LAST_DEVICE_INTERACTION_STATE',
  SET_LOCAL_WALLET_LOADING = 'SET_LOCAL_WALLET_LOADING',
  NATIVE_PASSWORD_OPEN = 'NATIVE_PASSWORD_OPEN',
  OPEN_KEEPKEY_PIN = 'OPEN_KEEPKEY_PIN',
  OPEN_KEEPKEY_PASSPHRASE = 'OPEN_KEEPKEY_PASSPHRASE',
  OPEN_KEEPKEY_INITIALIZE = 'OPEN_KEEPKEY_INITIALIZE',
  OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE = 'OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE',
  OPEN_KEEPKEY_DISCONNECT = 'OPEN_KEEPKEY_DISCONNECT',
  SET_DEVICE_STATE = 'SET_DEVICE_STATE',
  SET_PIN_REQUEST_TYPE = 'SET_PIN_REQUEST_TYPE',
  OPEN_KEEPKEY_RECOVERY = 'OPEN_KEEPKEY_RECOVERY',
  OPEN_KEEPKEY_CHARACTER_REQUEST = 'OPEN_KEEPKEY_CHARACTER_REQUEST',
  DOWNLOAD_UPDATER = 'DOWNLOAD_UPDATER',
}

export type ActionTypes =
  | { type: WalletActions.SET_ADAPTERS; payload: Partial<AdaptersByKeyManager> }
  | {
      type: WalletActions.SET_WALLET
      payload: WalletInfo & {
        isDemoWallet?: boolean
        wallet: HDWallet | null
        connectedType: KeyManager
      }
    }
  | {
      type: WalletActions.SET_IS_CONNECTED
      payload: { isConnected: boolean; modalType: KeyManager | string | null }
    }
  | { type: WalletActions.SET_WCV2_PROVIDER; payload: InitialState['wcV2Provider'] }
  | { type: WalletActions.SET_IS_LOCKED; payload: boolean }
  | {
      type: WalletActions.SET_CONNECTOR_TYPE
      payload:
        | { modalType: KeyManager | null; isMipdProvider: false }
        | { modalType: string | null; isMipdProvider: true }
    }
  | { type: WalletActions.SET_INITIAL_ROUTE; payload: string }
  | { type: WalletActions.SET_WALLET_MODAL; payload: boolean }
  | { type: WalletActions.DOWNLOAD_UPDATER; payload: boolean }
  | { type: WalletActions.SET_LOCAL_WALLET_LOADING; payload: boolean }
  | { type: WalletActions.SET_DEVICE_STATE; payload: Partial<DeviceState> }
  | { type: WalletActions.SET_PIN_REQUEST_TYPE; payload: PinMatrixRequestType }
  | {
      type: WalletActions.NATIVE_PASSWORD_OPEN
      payload: {
        modal: boolean
        deviceId: string
      }
    }
  | {
      type: WalletActions.OPEN_KEEPKEY_CHARACTER_REQUEST
      payload: {
        characterPos: number | undefined
        wordPos: number | undefined
      }
    }
  | {
      type: WalletActions.OPEN_KEEPKEY_PIN
      payload: {
        deviceId: string
        pinRequestType?: PinMatrixRequestType
        showBackButton?: boolean
      }
    }
  | {
      type: WalletActions.OPEN_KEEPKEY_PASSPHRASE
      payload: {
        deviceId: string
      }
    }
  | {
      type: WalletActions.OPEN_KEEPKEY_RECOVERY
      payload: {
        deviceId: string
      }
    }
  | {
      type: WalletActions.OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE
      payload: {
        deviceId: string
      }
    }
  | { type: WalletActions.RESET_STATE }
  | { type: WalletActions.RESET_LAST_DEVICE_INTERACTION_STATE }
  | {
      type: WalletActions.OPEN_KEEPKEY_INITIALIZE
      payload: {
        deviceId: string
      }
    }
  | { type: WalletActions.OPEN_KEEPKEY_DISCONNECT }
