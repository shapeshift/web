import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { HDWallet, Keyring } from '@shapeshiftoss/hdwallet-core'
import { getConfig } from 'config'
import { ipcRenderer } from 'electron'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from 'react'

import { KeyManager, SUPPORTED_WALLETS } from './config'
import { useKeepKeyEventHandler } from './KeepKey/hooks/useKeepKeyEventHandler'
import { useKeyringEventHandler } from './KeepKey/hooks/useKeyringEventHandler'
import { useNativeEventHandler } from './NativeWallet/hooks/useNativeEventHandler'
import { WalletViewsRouter } from './WalletViewsRouter'

export enum WalletActions {
  SET_ADAPTERS = 'SET_ADAPTERS',
  SET_WALLET = 'SET_WALLET',
  SET_CONNECTOR_TYPE = 'SET_CONNECTOR_TYPE',
  SET_INITIAL_ROUTE = 'SET_INITIAL_ROUTE',
  SET_IS_CONNECTED = 'SET_IS_CONNECTED',
  SET_WALLET_MODAL = 'SET_WALLET_MODAL',
  SET_KEEPKEY_STATE = 'SET_KEEPKEY_STATE',
  SET_KEEPKEY_STATUS = 'SET_KEEPKEY_STATUS',
  RESET_STATE = 'RESET_STATE'
}

type GenericAdapter = {
  initialize: (...args: any[]) => Promise<any>
  pairDevice: (...args: any[]) => Promise<HDWallet>
}

type Adapters = Map<KeyManager, GenericAdapter>
export interface InitialState {
  keyring: Keyring
  adapters: Adapters | null
  wallet: HDWallet | null
  type: KeyManager | null
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
  connect: (adapter: KeyManager) => Promise<void>
  disconnect: () => void
}

function playSound(type: any) {
  if (type === 'send') {
    const audio = new Audio(require('../../assets/sounds/send.mp3'))
    audio.play()
  }
  if (type === 'receive') {
    const audio = new Audio(require('../../assets/sounds/chaching.mp3'))
    audio.play()
  }
  if (type === 'success') {
    const audio = new Audio(require('../../assets/sounds/success.wav'))
    audio.play()
  }
  if (type === 'fail') {
    const audio = new Audio(require('../../assets/sounds/fail.mp3'))
    audio.play()
  }
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
  | { type: WalletActions.SET_CONNECTOR_TYPE; payload: KeyManager }
  | { type: WalletActions.SET_INITIAL_ROUTE; payload: string }
  | { type: WalletActions.SET_WALLET_MODAL; payload: boolean }
  | { type: WalletActions.SET_KEEPKEY_STATE; payload: string }
  | { type: WalletActions.SET_KEEPKEY_STATUS; payload: string }
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
      const newState = { ...state, modal: action.payload }
      // If we're closing the modal, then we need to forget the route we were on
      // Otherwise the connect button for last wallet we clicked on won't work
      if (action.payload !== state.modal) {
        newState.initialRoute = '/'
      }
      return newState
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
  useNativeEventHandler(state, dispatch)

  useEffect(() => {
    if (state.keyring) {
      ;(async () => {
        const adapters: Adapters = new Map()
        let options: undefined | { portisAppId: string }
        for (const wallet of Object.values(KeyManager)) {
          try {
            options =
              wallet === 'portis'
                ? { portisAppId: getConfig().REACT_APP_PORTIS_DAPP_ID }
                : undefined
            const adapter = SUPPORTED_WALLETS[wallet].adapter.useKeyring(state.keyring, options)
            // useKeyring returns the instance of the adapter. We'll keep it for future reference.
            if (wallet === 'keepkey') {
              await adapter.pairDevice('http://localhost:1646')
              adapters.set(wallet, adapter)
            } else {
              await adapter.initialize()
              adapters.set(wallet, adapter)
            }
          } catch (e) {
            console.error('Error initializing HDWallet adapters', e)
          }
        }

        dispatch({ type: WalletActions.SET_ADAPTERS, payload: adapters })
      })()
    }
  }, [state.keyring])

  //onStart()
  useEffect(() => {
    console.log('onStartApp: CHECKPOINT')
    ipcRenderer.send('onStartApp', {})

    //listen to events on main
    ipcRenderer.on('hardware', (event, data) => {
      //event
      //console.log('hardware event: ', data)

      switch (data.event.event) {
        case 'connect':
          console.log('connect')
          // playSound('success')
          // code block
          break
        case 'disconnect':
          console.log('disconnect')
          //playSound('fail')

          // code block
          break
        default:
        //TODO Spammy
        //console.log("unhandled event! ",data.event)
      }
    })

    ipcRenderer.on('playSound', (event, data) => {
      console.log('sound: ', data)
      // playSound(data.sound)
    })

    ipcRenderer.on('attach', (event, data) => {
      console.log('attach', data)
      // playSound('success')
      dispatch({ type: WalletActions.SET_KEEPKEY_STATE, payload: data.state })
      dispatch({ type: WalletActions.SET_KEEPKEY_STATUS, payload: data.status })
    })

    ipcRenderer.on('detach', (event, data) => {
      console.log('detach', data)
      playSound('fail')
      dispatch({ type: WalletActions.SET_KEEPKEY_STATE, payload: data.state })
      dispatch({ type: WalletActions.SET_KEEPKEY_STATUS, payload: data.status })
    })

    ipcRenderer.on('setKeepKeyState', (event, data) => {
      dispatch({ type: WalletActions.SET_KEEPKEY_STATE, payload: data.state })
      dispatch({ type: WalletActions.SET_KEEPKEY_STATUS, payload: data.status })
    })

    ipcRenderer.on('setKeepKeyStatus', (event, data) => {
      dispatch({ type: WalletActions.SET_KEEPKEY_STATE, payload: data.state })
      dispatch({ type: WalletActions.SET_KEEPKEY_STATUS, payload: data.status })
    })

    ipcRenderer.on('setDevice', (event, data) => {
      console.log('setDevice', data)
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // we explicitly only want this to happen once

  //onStart()
  const connect = useCallback(
    async (type: KeyManager) => {
      console.log('WalletProvider Connect: ', type)
      if (type === 'keepkey') {
        const adapter = SUPPORTED_WALLETS['keepkey'].adapter.useKeyring(state.keyring)
        try {
          await adapter.pairDevice('http://localhost:1646')
          const adapters: Adapters = new Map()
          adapters.set('keepkey' as KeyManager, adapter)
          dispatch({ type: WalletActions.SET_ADAPTERS, payload: adapters })
        } catch (e) {
          dispatch({ type: WalletActions.SET_KEEPKEY_STATE, payload: '-1' })
          dispatch({
            type: WalletActions.SET_KEEPKEY_STATUS,
            payload: 'error: failed to connect to bridge'
          })
        }
      }
      dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: type })
      if (SUPPORTED_WALLETS[type]?.routes[0]?.path) {
        dispatch({
          type: WalletActions.SET_INITIAL_ROUTE,
          payload: SUPPORTED_WALLETS[type].routes[0].path as string
        })
      }
    },
    [state.keyring]
  )

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
