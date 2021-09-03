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
import { useState } from 'react'

import { SUPPORTED_WALLETS } from './config'
import { WalletViewsRouter } from './WalletViewsRouter'

export enum WalletActions {
  SET_ADAPTERS = 'SET_ADAPTERS',
  SET_WALLET = 'SET_WALLET',
  SET_WALLET_INFO = 'SET_WALLET_INFO',
  SET_IS_CONNECTED = 'SET_IS_CONNECTED',
  SET_WALLET_MODAL = 'SET_WALLET_MODAL',
  RESET_STATE = 'RESET_STATE'
}

export interface InitialState {
  keyring: Keyring
  adapters: Record<string, unknown> | null
  wallet: HDWallet | NativeHDWallet | null
  walletInfo: { name: string; icon: string } | null
  isConnected: boolean
  modal: boolean
}

const initialState: InitialState = {
  keyring: new Keyring(),
  adapters: null,
  wallet: null,
  walletInfo: null,
  isConnected: false,
  modal: false
}

export interface IWalletContext {
  state: InitialState
  dispatch: React.Dispatch<ActionTypes>
  connect: (type: string) => Promise<void>
  disconnect: () => void
}

export type ActionTypes =
  | { type: WalletActions.SET_ADAPTERS; payload: Record<string, unknown> }
  | { type: WalletActions.SET_WALLET; payload: HDWallet | null }
  | { type: WalletActions.SET_WALLET_INFO; payload: { name: string; icon: string } }
  | { type: WalletActions.SET_IS_CONNECTED; payload: boolean }
  | { type: WalletActions.SET_WALLET_MODAL; payload: boolean }
  | { type: WalletActions.RESET_STATE }

const reducer = (state: InitialState, action: ActionTypes) => {
  switch (action.type) {
    case WalletActions.SET_ADAPTERS:
      return { ...state, adapters: action.payload }
    case WalletActions.SET_WALLET:
      return { ...state, wallet: action.payload }
    case WalletActions.SET_WALLET_INFO:
      return { ...state, walletInfo: { name: action?.payload?.name, icon: action?.payload?.icon } }
    case WalletActions.SET_IS_CONNECTED:
      return { ...state, isConnected: action.payload }
    case WalletActions.SET_WALLET_MODAL:
      return { ...state, modal: action.payload }
    case WalletActions.RESET_STATE:
      return {
        ...state,
        wallet: null,
        walletInfo: null,
        isConnected: false
      }
    default:
      return state
  }
}

const WalletContext = createContext<IWalletContext | null>(null)

export const WalletProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [type, setType] = useState<string | null>(null)
  const [routePath, setRoutePath] = useState<string | readonly string[] | undefined>()

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

  /**
   * temp logging data here for dev use
   */
  const connect = useCallback(async (type: string) => {
    setType(type)
    setRoutePath(SUPPORTED_WALLETS[type]?.routes[0]?.path ?? undefined)
  }, [])

  const disconnect = useCallback(() => {
    state.wallet?.disconnect()
    setType(null)
    setRoutePath(undefined)
    dispatch({ type: WalletActions.RESET_STATE })
  }, [state.wallet])

  const value: IWalletContext = useMemo(
    () => ({ state, dispatch, connect, disconnect }),
    [state, connect, disconnect]
  )

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletViewsRouter
        connect={connect}
        modalOpen={state.modal}
        type={type}
        routePath={routePath}
      />
    </WalletContext.Provider>
  )
}

export const useWallet = (): IWalletContext =>
  useContext(WalletContext as React.Context<IWalletContext>)
