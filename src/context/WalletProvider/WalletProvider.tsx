import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { HDWallet, Keyring } from '@shapeshiftoss/hdwallet-core'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from 'react'

import { SUPPORTED_WALLETS } from './config'
import { WalletViewsRouter } from './WalletViewsRouter'

export enum WalletActions {
  SET_ADAPTERS = 'SET_ADAPTERS',
  SET_WALLET = 'SET_WALLET',
  SET_CONNECTOR_TYPE = 'SET_CONNECTOR_TYPE',
  SET_INITAL_ROUTE = 'SET_INITAL_ROUTE',
  SET_IS_CONNECTED = 'SET_IS_CONNECTED',
  SET_WALLET_MODAL = 'SET_WALLET_MODAL',
  RESET_STATE = 'RESET_STATE'
}

export interface InitialState {
  keyring: Keyring
  adapters: Record<string, unknown> | null
  wallet: HDWallet | NativeHDWallet | null
  type: string | null
  initalRoute: string | null
  walletInfo: { name: string; icon: ComponentWithAs<'svg', IconProps>; deviceId: string } | null
  isConnected: boolean
  modal: boolean
}

const initialState: InitialState = {
  keyring: new Keyring(),
  adapters: null,
  wallet: null,
  type: null,
  initalRoute: null,
  walletInfo: null,
  isConnected: false,
  modal: false
}

export interface IWalletContext {
  state: InitialState
  dispatch: React.Dispatch<ActionTypes>
  connect: (adapter: string) => Promise<void>
  disconnect: () => void
}

export type ActionTypes =
  | { type: WalletActions.SET_ADAPTERS; payload: Record<string, unknown> }
  | {
      type: WalletActions.SET_WALLET
      payload: {
        wallet: HDWallet | null
        name: string
        icon: ComponentWithAs<'svg', IconProps>
        deviceId: string
      }
    }
  | { type: WalletActions.SET_IS_CONNECTED; payload: boolean }
  | { type: WalletActions.SET_CONNECTOR_TYPE; payload: string }
  | { type: WalletActions.SET_INITAL_ROUTE; payload: string }
  | { type: WalletActions.SET_WALLET_MODAL; payload: boolean }
  | { type: WalletActions.RESET_STATE }

const reducer = (state: InitialState, action: ActionTypes) => {
  switch (action.type) {
    case WalletActions.SET_ADAPTERS:
      return { ...state, adapters: action.payload }
    case WalletActions.SET_WALLET:
      return {
        ...state,
        wallet: action.payload.wallet,
        walletInfo: {
          name: action?.payload?.name,
          icon: action?.payload?.icon,
          deviceId: action?.payload?.deviceId
        }
      }
    case WalletActions.SET_IS_CONNECTED:
      return { ...state, isConnected: action.payload }
    case WalletActions.SET_CONNECTOR_TYPE:
      return { ...state, type: action.payload }
    case WalletActions.SET_INITAL_ROUTE:
      return { ...state, initalRoute: action.payload }
    case WalletActions.SET_WALLET_MODAL:
      return { ...state, modal: action.payload }
    case WalletActions.RESET_STATE:
      return {
        ...state,
        wallet: null,
        walletInfo: null,
        isConnected: false,
        type: null,
        initalRoute: null
      }
    default:
      return state
  }
}

const WalletContext = createContext<IWalletContext | null>(null)

export const WalletProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (state.keyring) {
      ;(async () => {
        const adapters: Record<string, unknown> = {}
        for (const wallet of Object.keys(SUPPORTED_WALLETS)) {
          try {
            const adapter = SUPPORTED_WALLETS[wallet].adapter.useKeyring(state.keyring)
            // useKeyring returns the instance of the adapter. We'll keep it for future reference.
            await adapter.initialize()
            adapters[wallet] = adapter
          } catch (e) {
            console.error('Error initalizing HDWallet adapters', e)
          }
        }

        dispatch({ type: WalletActions.SET_ADAPTERS, payload: adapters })
      })()
    }
  }, [state.keyring])

  const connect = useCallback(async (type: string) => {
    dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: type })
    if (SUPPORTED_WALLETS[type]?.routes[0]?.path) {
      dispatch({
        type: WalletActions.SET_INITAL_ROUTE,
        payload: SUPPORTED_WALLETS[type].routes[0].path as string
      })
    }
  }, [])

  const disconnect = useCallback(() => {
    state.wallet?.disconnect()
    dispatch({ type: WalletActions.RESET_STATE })
  }, [state.wallet])

  const value: IWalletContext = useMemo(
    () => ({ state, dispatch, connect, disconnect }),
    [state, connect, disconnect]
  )

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletViewsRouter />
    </WalletContext.Provider>
  )
}

export const useWallet = (): IWalletContext =>
  useContext(WalletContext as React.Context<IWalletContext>)
