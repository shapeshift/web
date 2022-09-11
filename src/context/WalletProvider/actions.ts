import type { HDWallet } from '@shapeshiftoss/hdwallet-core'

import type { PinMatrixRequestType } from './KeepKey/KeepKeyTypes'
import type { KeyManager } from './KeyManager'
import type { Adapters, InitialState, WalletInfo } from './WalletProvider'
import type { DeviceState } from './WalletProvider'

export enum WalletActions {
  SET_ADAPTERS = 'SET_ADAPTERS',
  SET_WALLET = 'SET_WALLET',
  SET_CONNECTOR_TYPE = 'SET_CONNECTOR_TYPE',
  SET_INITIAL_ROUTE = 'SET_INITIAL_ROUTE',
  SET_IS_CONNECTED = 'SET_IS_CONNECTED',
  SET_IS_DEMO_WALLET = 'SET_IS_DEMO_WALLET',
  SET_PROVIDER = 'SET_PROVIDER',
  SET_IS_LOCKED = 'SET_IS_LOCKED',
  SET_WALLET_MODAL = 'SET_WALLET_MODAL',
  RESET_STATE = 'RESET_STATE',
  SET_LOCAL_WALLET_LOADING = 'SET_LOCAL_WALLET_LOADING',
  NATIVE_PASSWORD_OPEN = 'NATIVE_PASSWORD_OPEN',
  OPEN_KEEPKEY_PIN = 'OPEN_KEEPKEY_PIN',
  OPEN_KEEPKEY_PASSPHRASE = 'OPEN_KEEPKEY_PASSPHRASE',
  OPEN_KEEPKEY_INITIALIZE = 'OPEN_KEEPKEY_INITIALIZE',
  OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE = 'OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE',
  SET_DEVICE_STATE = 'SET_DEVICE_STATE',
  OPEN_KEEPKEY_RECOVERY = 'OPEN_KEEPKEY_RECOVERY',
  OPEN_KEEPKEY_CHARACTER_REQUEST = 'OPEN_KEEPKEY_CHARACTER_REQUEST',
}

export type ActionTypes =
  | { type: WalletActions.SET_ADAPTERS; payload: Adapters }
  | {
      type: WalletActions.SET_WALLET
      payload: WalletInfo & { wallet: HDWallet | null }
    }
  | { type: WalletActions.SET_IS_CONNECTED; payload: boolean }
  | { type: WalletActions.SET_IS_DEMO_WALLET; payload: boolean }
  | { type: WalletActions.SET_PROVIDER; payload: InitialState['provider'] }
  | { type: WalletActions.SET_IS_LOCKED; payload: boolean }
  | { type: WalletActions.SET_CONNECTOR_TYPE; payload: KeyManager }
  | { type: WalletActions.SET_INITIAL_ROUTE; payload: string }
  | { type: WalletActions.SET_WALLET_MODAL; payload: boolean }
  | { type: WalletActions.SET_LOCAL_WALLET_LOADING; payload: boolean }
  | { type: WalletActions.SET_DEVICE_STATE; payload: Partial<DeviceState> }
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
  | {
      type: WalletActions.OPEN_KEEPKEY_INITIALIZE
      payload: {
        deviceId: string
      }
    }
