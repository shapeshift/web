import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { HDWallet, Keyring } from '@shapeshiftoss/hdwallet-core'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from 'react'

import { KeyMananger, SUPPORTED_WALLETS } from './config'
import { useKeepKeyEventHandler } from './KeepKey/hooks/useKeepKeyEventHandler'
import { useKeyringEventHandler } from './KeepKey/hooks/useKeyringEventHandler'
import { WalletViewsRouter } from './WalletViewsRouter'

export enum WalletActions {
  SET_ADAPTERS = 'SET_ADAPTERS',
  SET_WALLET = 'SET_WALLET',
  SET_CONNECTOR_TYPE = 'SET_CONNECTOR_TYPE',
  SET_INITIAL_ROUTE = 'SET_INITIAL_ROUTE',
  SET_IS_CONNECTED = 'SET_IS_CONNECTED',
  SET_WALLET_MODAL = 'SET_WALLET_MODAL',
  RESET_STATE = 'RESET_STATE'
}

type GenericAdapter = {
  initialize: (...args: any[]) => Promise<any>
  pairDevice: (...args: any[]) => Promise<HDWallet>
}

type Adapters = Map<KeyMananger, GenericAdapter>
export interface InitialState {
  keyring: Keyring
  adapters: Adapters | null
  wallet: HDWallet | null
  type: KeyMananger | null
  initialRoute: string | null
  walletInfo: { name: string; icon: ComponentWithAs<'svg', IconProps>; deviceId: string } | null
  isConnected: boolean
  modal: boolean
}

const initialState: InitialState = {
  keyring: new Keyring(),
  adapters: null,
  wallet: null,
  type: null,
  initialRoute: null,
  walletInfo: null,
  isConnected: false,
  modal: false
}

export interface IWalletContext {
  state: InitialState
  dispatch: React.Dispatch<ActionTypes>
  connect: (adapter: KeyMananger) => Promise<void>
  disconnect: () => void
}

export type ActionTypes =
  | { type: WalletActions.SET_ADAPTERS; payload: Adapters }
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
  | { type: WalletActions.SET_CONNECTOR_TYPE; payload: KeyMananger }
  | { type: WalletActions.SET_INITIAL_ROUTE; payload: string }
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
    case WalletActions.SET_INITIAL_ROUTE:
      return { ...state, initialRoute: action.payload }
    case WalletActions.SET_WALLET_MODAL:
      return { ...state, modal: action.payload }
    case WalletActions.RESET_STATE:
      return {
        ...state,
        wallet: null,
        walletInfo: null,
        isConnected: false,
        type: null,
        initialRoute: null
      }
    default:
      return state
  }
}

const WalletContext = createContext<IWalletContext | null>(null)

export const WalletProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [state, dispatch] = useReducer(reducer, initialState)
  useKeyringEventHandler(state)
  useKeepKeyEventHandler(state, dispatch)

  useEffect(() => {
    if (state.keyring) {
      ;(async () => {
        const adapters: Adapters = new Map()
        for (const wallet of Object.values(KeyMananger)) {
          try {
            const adapter = SUPPORTED_WALLETS[wallet].adapter.useKeyring(state.keyring)
            // useKeyring returns the instance of the adapter. We'll keep it for future reference.
            await adapter.initialize()
            adapters.set(wallet, adapter)
          } catch (e) {
            console.error('Error initializing HDWallet adapters', e)
          }
        }

        dispatch({ type: WalletActions.SET_ADAPTERS, payload: adapters })
      })()
    }
  }, [state.keyring])

  const connect = useCallback(async (type: KeyMananger) => {
    dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: type })
    if (SUPPORTED_WALLETS[type]?.routes[0]?.path) {
      dispatch({
        type: WalletActions.SET_INITIAL_ROUTE,
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
