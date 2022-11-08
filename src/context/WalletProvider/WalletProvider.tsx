/* eslint-disable @keepkey/logger/no-native-console */
import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import type { KeepKeySDK } from '@keepkey/keepkey-sdk'
import { getKeepKeySDK } from '@keepkey/keepkey-sdk'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import type { WalletConnectProviderConfig } from '@shapeshiftoss/hdwallet-walletconnect'
import type WalletConnectProvider from '@walletconnect/web3-provider'
import { randomUUID } from 'crypto'
import { ipcRenderer } from 'electron'
import type { providers } from 'ethers'
import debounce from 'lodash/debounce'
import findIndex from 'lodash/findIndex'
import omit from 'lodash/omit'
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Entropy } from 'context/WalletProvider/KeepKey/components/RecoverySettings'
import { VALID_ENTROPY } from 'context/WalletProvider/KeepKey/components/RecoverySettings'
import { useKeepKeyEventHandler } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyEventHandler'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'
import { logger } from 'lib/logger'

import type { ActionTypes } from './actions'
import { WalletActions } from './actions'
import { SUPPORTED_WALLETS } from './config'
import { KeepKeyConfig } from './KeepKey/config'
import { useKeyringEventHandler } from './KeepKey/hooks/useKeyringEventHandler'
import type { PinMatrixRequestType } from './KeepKey/KeepKeyTypes'
import { KeyManager } from './KeyManager'
import {
  clearLocalWallet,
  getLocalWalletDeviceId,
  getLocalWalletType,
  setLocalWalletTypeAndDeviceId,
} from './local-wallet'
import type { IWalletContext } from './WalletContext'
import { WalletContext } from './WalletContext'
import { WalletViewsRouter } from './WalletViewsRouter'

const moduleLogger = logger.child({ namespace: ['WalletProvider'] })

type GenericAdapter = {
  initialize: (...args: any[]) => Promise<any>
  pairDevice: (...args: any[]) => Promise<HDWallet>
}

export type Adapters = Map<KeyManager, GenericAdapter>

export type WalletInfo = {
  name: string
  icon: ComponentWithAs<'svg', IconProps>
  deviceId: string
  meta?: { label?: string; address?: string }
}

export type WalletConnectApp = {
  name: string
  icons: string[]
  description: string
  url: string
}

export type Outcome = 'success' | 'error'
export type DeviceDisposition = 'initialized' | 'recovering' | 'initializing'

export type DeviceState = {
  awaitingDeviceInteraction: boolean
  lastDeviceInteractionStatus: Outcome | undefined
  disposition: DeviceDisposition | undefined
  recoverWithPassphrase: boolean | undefined
  recoveryEntropy: Entropy
  recoveryCharacterIndex: number | undefined
  recoveryWordIndex: number | undefined
  isUpdatingPin: boolean | undefined
  isDeviceLoading: boolean | undefined
}

const initialDeviceState: DeviceState = {
  awaitingDeviceInteraction: false,
  lastDeviceInteractionStatus: undefined,
  disposition: undefined,
  recoverWithPassphrase: undefined,
  recoveryEntropy: VALID_ENTROPY[0],
  recoveryCharacterIndex: undefined,
  recoveryWordIndex: undefined,
  isUpdatingPin: false,
  isDeviceLoading: false,
}
export type MetaMaskLikeProvider = providers.Web3Provider & { isTally?: boolean }

export interface InitialState {
  keyring: Keyring
  adapters: Adapters | null
  wallet: HDWallet | null
  type: KeyManager | null
  initialRoute: string | null
  walletInfo: WalletInfo | null
  isConnected: boolean
  isUpdatingKeepkey: boolean
  isDemoWallet: boolean
  provider: MetaMaskLikeProvider | WalletConnectProvider | null
  isLocked: boolean
  modal: boolean
  isLoadingLocalWallet: boolean
  deviceId: string
  showBackButton: boolean
  keepKeyPinRequestType: PinMatrixRequestType | null
  deviceState: DeviceState
  disconnectOnCloseModal: boolean
  keepkeySdk: KeepKeySDK | null
  browserUrl: string | null
}

const initialState: InitialState = {
  keyring: new Keyring(),
  adapters: null,
  wallet: null,
  type: KeyManager.KeepKey,
  initialRoute: null,
  walletInfo: null,
  isConnected: false,
  isDemoWallet: false,
  provider: null,
  isLocked: false,
  modal: false,
  isLoadingLocalWallet: false,
  deviceId: '',
  showBackButton: true,
  keepKeyPinRequestType: null,
  deviceState: initialDeviceState,
  disconnectOnCloseModal: false,
  keepkeySdk: null,
  browserUrl: null,
  isUpdatingKeepkey: false,
}

export const isKeyManagerWithProvider = (keyManager: KeyManager | null) => Boolean(keyManager)

const reducer = (state: InitialState, action: ActionTypes) => {
  switch (action.type) {
    case WalletActions.SET_ADAPTERS:
      return { ...state, adapters: action.payload }
    case WalletActions.SET_WALLET:
      return {
        ...state,
        isDemoWallet: Boolean(action.payload.isDemoWallet),
        wallet: action.payload.wallet,
        walletInfo: {
          name: action?.payload?.name,
          icon: action?.payload?.icon,
          deviceId: action?.payload?.deviceId,
          meta: {
            label: action.payload.meta?.label ?? '',
            address: '',
          },
        },
      }
    case WalletActions.SET_BROWSER_URL:
      return { ...state, browserUrl: action.payload }
    case WalletActions.SET_PROVIDER:
      return { ...state, provider: action.payload }
    case WalletActions.SET_IS_CONNECTED:
      return { ...state, isConnected: action.payload }
    case WalletActions.SET_IS_LOCKED:
      return { ...state, isLocked: action.payload }
    case WalletActions.SET_CONNECTOR_TYPE:
      return { ...state, type: action.payload }
    case WalletActions.SET_INITIAL_ROUTE:
      return { ...state, initialRoute: action.payload }
    case WalletActions.SET_PIN_REQUEST_TYPE:
      return { ...state, keepKeyPinRequestType: action.payload }
    case WalletActions.SET_KEEPKEY_SDK:
      return { ...state, keepkeySdk: action.payload }
    case WalletActions.SET_DEVICE_STATE: {
      const { deviceState } = state
      const {
        awaitingDeviceInteraction = deviceState.awaitingDeviceInteraction,
        lastDeviceInteractionStatus = deviceState.lastDeviceInteractionStatus,
        disposition = deviceState.disposition,
        recoverWithPassphrase = deviceState.recoverWithPassphrase,
        recoveryEntropy = deviceState.recoveryEntropy,
        isUpdatingPin = deviceState.isUpdatingPin,
        isDeviceLoading = deviceState.isDeviceLoading,
      } = action.payload
      return {
        ...state,
        deviceState: {
          ...deviceState,
          awaitingDeviceInteraction,
          lastDeviceInteractionStatus,
          disposition,
          recoverWithPassphrase,
          recoveryEntropy,
          isUpdatingPin,
          isDeviceLoading,
        },
      }
    }
    case WalletActions.SET_WALLET_MODAL:
      const newState = { ...state, modal: action.payload }
      // If we're closing the modal, then we need to forget the route we were on
      // Otherwise the connect button for last wallet we clicked on won't work
      if (!action.payload && state.modal) {
        newState.initialRoute = '/'
        newState.isLoadingLocalWallet = false
        newState.showBackButton = true
        newState.keepKeyPinRequestType = null
      }
      return newState
    case WalletActions.OPEN_KEEPKEY_PIN: {
      const { showBackButton, deviceId, pinRequestType } = action.payload
      return {
        ...state,
        modal: true,
        type: KeyManager.KeepKey,
        showBackButton: showBackButton ?? false,
        deviceId,
        keepKeyPinRequestType: pinRequestType ?? null,
        initialRoute: KeepKeyRoutes.Pin,
      }
    }
    case WalletActions.OPEN_KEEPKEY_CHARACTER_REQUEST: {
      const { characterPos: recoveryCharacterIndex, wordPos: recoveryWordIndex } = action.payload
      const { deviceState } = state
      return {
        ...state,
        modal: true,
        showBackButton: false,
        type: KeyManager.KeepKey,
        initialRoute: KeepKeyRoutes.RecoverySentenceEntry,
        deviceState: {
          ...deviceState,
          recoveryCharacterIndex,
          recoveryWordIndex,
        },
      }
    }
    case WalletActions.OPEN_KEEPKEY_PASSPHRASE:
      return {
        ...state,
        modal: true,
        type: KeyManager.KeepKey,
        showBackButton: false,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.Passphrase,
      }
    case WalletActions.OPEN_KEEPKEY_INITIALIZE:
      return {
        ...state,
        modal: true,
        showBackButton: false,
        disconnectOnCloseModal: true,
        type: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.FactoryState,
      }
    case WalletActions.OPEN_KEEPKEY_LABEL:
      return {
        ...state,
        modal: true,
        showBackButton: false,
        disconnectOnCloseModal: true,
        type: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.NewLabel,
      }
    case WalletActions.OPEN_KEEPKEY_RECOVERY:
      return {
        ...state,
        modal: true,
        type: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.NewRecoverySentence,
      }
    case WalletActions.OPEN_KEEPKEY_RECOVERY_SETTINGS:
      return {
        ...state,
        modal: true,
        showBackButton: false,
        disconnectOnCloseModal: true,
        type: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.RecoverySettings,
      }
    case WalletActions.OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE:
      return {
        ...state,
        modal: true,
        type: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.RecoverySentenceInvalid,
      }
    case WalletActions.CLEAR_MODAL_CACHE:
      return {
        ...state,
        modal: false,
        initialRoute: '/',
        isLoadingLocalWallet: false,
        showBackButton: true,
        keepKeyPinRequestType: null,
        keyring: new Keyring()
      }
    case WalletActions.SET_LOCAL_WALLET_LOADING:
      return { ...state, isLoadingLocalWallet: action.payload }
    case WalletActions.RESET_STATE:
      const resetProperties = omit(initialState, ['adapters', 'modal', 'deviceId'])
      return { ...state, ...resetProperties }
    // TODO: Remove this once we update SET_DEVICE_STATE to allow explicitly setting falsey values
    case WalletActions.RESET_LAST_DEVICE_INTERACTION_STATE: {
      const { deviceState } = state
      return {
        ...state,
        deviceState: {
          ...deviceState,
          lastDeviceInteractionStatus: undefined,
        },
      }
    }
    case WalletActions.DOWNLOAD_UPDATER:
      return {
        ...state,
        modal: true,
        type: KeyManager.KeepKey,
        initialRoute: KeepKeyRoutes.DownloadUpdater,
      }
    default:
      return state
  }
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
    //eww nerf
    // const audio = new Audio(require('../../assets/sounds/fail.mp3'))
    // audio.play()
  }
}

export const WalletProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  // External, exposed state to be consumed with useWallet()
  const [state, dispatch] = useReducer(reducer, initialState)
  // Keepkey is in a fucked state and needs to be unplugged/replugged
  const [needsReset, setNeedsReset] = useState(false)

  // to know we are in the process of updating bootloader or firmware
  // so we dont unintentionally show the keepkey error modal while updating
  const [isUpdatingKeepkey, setIsUpdatingKeepkey] = useState(false)

  // is keepkey device currently being interacted with
  const [deviceBusy, setDeviceBusy] = useState(false)

  const disconnect = useCallback(async () => {
    /**
     * in case of KeepKey placeholder wallet,
     * the disconnect function is undefined
     */
    clearLocalWallet()
    dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
    dispatch({ type: WalletActions.RESET_STATE })
    setIsUpdatingKeepkey(false)
  }, [])

  const load = useCallback(() => {
    const fnLogger = moduleLogger.child({ fn: ['load'] })

    const localWalletType = getLocalWalletType()
    const localWalletDeviceId = getLocalWalletDeviceId()
    fnLogger.trace({ localWalletType, localWalletDeviceId }, 'Load local wallet')
    if (localWalletType && localWalletDeviceId && state.adapters) {
      ; (async () => {
        if (state.adapters?.has(localWalletType)) {
          // Fixes issue with wallet `type` being null when the wallet is loaded from state
          dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })
          switch (localWalletType) {
            case KeyManager.KeepKey:
              try {
                const localKeepKeyWallet = state.keyring.get(localWalletDeviceId)
                /**
                 * if localKeepKeyWallet is not null it means
                 * KeepKey remained connected during the reload
                 */
                if (localKeepKeyWallet) {
                  const { name, icon } = SUPPORTED_WALLETS[KeyManager.KeepKey]
                  const deviceId = await localKeepKeyWallet.getDeviceID()
                  // This gets the firmware version needed for some KeepKey "supportsX" functions
                  await localKeepKeyWallet.getFeatures()
                  // Show the label from the wallet instead of a generic name
                  const label = (await localKeepKeyWallet.getLabel()) || name

                  await localKeepKeyWallet.initialize()

                  dispatch({
                    type: WalletActions.SET_WALLET,
                    payload: {
                      wallet: localKeepKeyWallet,
                      name: label,
                      icon,
                      deviceId,
                      meta: { label },
                    },
                  })
                  dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
                  setNeedsReset(false)
                } else {
                  /**
                   * The KeepKey wallet is disconnected,
                   * because the accounts are not persisted, the app cannot load without getting pub keys from the
                   * wallet.
                   */
                  // TODO(ryankk): If persist is turned back on, we can restore the previous deleted code.
                  disconnect()
                }
              } catch (e) {
                disconnect()
              }
              dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
              break
            default:
              /**
               * The fall-through case also handles clearing
               * any demo wallet state on refresh/rerender.
               */
              disconnect()
              break
          }
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.adapters, state.keyring])

  const pairAndConnect = useRef(
    debounce(async () => {
      const adapters: Adapters = new Map()
      let options: undefined | { portisAppId: string } | WalletConnectProviderConfig
      for (const walletName of Object.values(KeyManager)) {
        try {
          const adapter = SUPPORTED_WALLETS[walletName].adapter.useKeyring(state.keyring, options)

          const wallet = await adapter.pairDevice('http://localhost:1646')
          adapters.set(walletName, adapter)
          dispatch({ type: WalletActions.SET_ADAPTERS, payload: adapters })
          const { name, icon } = KeepKeyConfig
          const deviceId = await wallet.getDeviceID()
          // Show the label from the wallet instead of a generic name
          const label = (await wallet.getLabel()) || name
          await wallet.initialize()
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name: label, icon, deviceId, meta: { label } },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          /**
           * The real deviceId of KeepKey wallet could be different from the
           * deviceId recieved from the wallet, so we need to keep
           * aliases[deviceId] in the local wallet storage.
           */
          setLocalWalletTypeAndDeviceId(KeyManager.KeepKey, state.keyring.getAlias(deviceId))
        } catch (e) {
          moduleLogger.error(e, 'Error initializing HDWallet adapters')
        }
      }
    }, 2000),
  )

  const startBridgeListeners = useCallback(() => {
    ipcRenderer.on('@walletconnect/paired', (_event, data) => {
      dispatch({ type: WalletActions.SET_WALLET_CONNECT_APP, payload: data })
    })

    //listen to events on main
    ipcRenderer.on('hardware', (_event, data) => {
      switch (data.event.event) {
        case 'connect':
          playSound('success')
          break
        case 'disconnect':
          playSound('fail')
          break
        default:
      }
    })

    ipcRenderer.on('needsInitialize', () => {
      // if needs initialize we do the normal pair process and then web detects that it needs initialize
      pairAndConnect.current()
    })

    //HDwallet API
    //TODO moveme into own file
    ipcRenderer.on('@hdwallet/osmosisGetAddress', async (_event, data) => {
      let payload = data.payload
      if (state.wallet) {
        console.info('state.wallet: ', state.wallet)
        // @ts-ignore
        let pubkeys = await state.wallet.osmosisGetAddress(payload)
        ipcRenderer.send('@hdwallet/response/osmosisGetAddress', pubkeys)
      }
    })

    ipcRenderer.on('@hdwallet/cosmosSignTx', async (_event, data) => {
      let HDwalletPayload = data.payload
      if (state.wallet) {
        console.info('state.wallet: ', state.wallet)
        // @ts-ignore
        let pubkeys = await state.wallet.thorchainSignTx(HDwalletPayload)
        ipcRenderer.send('@hdwallet/cosmosSignTx', pubkeys)
      }
    })

    ipcRenderer.on('@hdwallet/osmosisSignTx', async (_event, data) => {
      let HDwalletPayload = data.payload
      if (state.wallet) {
        console.info('state.wallet: ', state.wallet)
        // @ts-ignore
        let pubkeys = await state.wallet.osmosisSignTx(HDwalletPayload)
        ipcRenderer.send('@hdwallet/response/osmosisSignTx', pubkeys)
      }
    })

    ipcRenderer.on('connected', async (_event, _data) => {
      pairAndConnect.current()
    })

    ipcRenderer.on('deviceBusy', async (_event, _data) => {
      setDeviceBusy(true)
    })
    ipcRenderer.on('deviceNotBusy', async (_event, _data) => {
      setDeviceBusy(false)
    })

    //END HDwallet API

    // inform the electron process we are ready to receive ipc messages
    ipcRenderer.send('renderListenersReady', {})
  }, [state.wallet])

  const setupKeepKeySDK = () => {
    let serviceKey = window.localStorage.getItem('@app/serviceKey')
    let config = {
      serviceName: 'KeepKey Desktop',
      serviceImageUrl:
        'https://github.com/BitHighlander/keepkey-desktop/raw/master/electron/icon.png',
      serviceKey: serviceKey ? serviceKey : randomUUID(),
    }
    if (!serviceKey) {
      window.localStorage.setItem('@app/serviceKey', config.serviceKey)
      ipcRenderer.send('@bridge/add-service', config)
    }
    getKeepKeySDK(config)
      .then(sdk => {
        dispatch({ type: WalletActions.SET_KEEPKEY_SDK, payload: sdk })
      })
      .catch(e => {
        console.log('GET KEEPKEYSDK ERROR', e)
      })
  }

  useEffect(() => {
    disconnect()
    startBridgeListeners()
    setupKeepKeySDK()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const create = useCallback(async (type: KeyManager) => {
    dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: type })
    const routeIndex = findIndex(SUPPORTED_WALLETS[type]?.routes, ({ path }) =>
      String(path).endsWith('create'),
    )
    if (routeIndex > -1) {
      dispatch({
        type: WalletActions.SET_INITIAL_ROUTE,
        payload: SUPPORTED_WALLETS[type].routes[routeIndex].path as string,
      })
    }
  }, [])

  const setDeviceState = useCallback((deviceState: Partial<DeviceState>) => {
    dispatch({
      type: WalletActions.SET_DEVICE_STATE,
      payload: deviceState,
    })
  }, [])

  useEffect(() => load(), [load, state.adapters, state.keyring])

  useKeyringEventHandler(state)
  useKeepKeyEventHandler(state, dispatch, load, setDeviceState, setNeedsReset)

  const value: IWalletContext = useMemo(
    () => ({
      state,
      dispatch,
      create,
      disconnect,
      load,
      setDeviceState,
      isUpdatingKeepkey,
      setIsUpdatingKeepkey,
      pairAndConnect,
      deviceBusy,
      needsReset,
      setNeedsReset
    }),
    [
      state,
      create,
      disconnect,
      load,
      setDeviceState,
      setIsUpdatingKeepkey,
      isUpdatingKeepkey,
      pairAndConnect,
      deviceBusy,
      needsReset,
      setNeedsReset
    ],
  )

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletViewsRouter />
    </WalletContext.Provider>
  )
}
