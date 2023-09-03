import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
import detectEthereumProvider from '@metamask/detect-provider'
import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import type { CoinbaseProviderConfig } from '@shapeshiftoss/hdwallet-coinbase'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import type { MetaMaskHDWallet } from '@shapeshiftoss/hdwallet-metamask'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import * as native from '@shapeshiftoss/hdwallet-native'
import type { WalletConnectProviderConfig } from '@shapeshiftoss/hdwallet-walletconnect'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { getConfig } from 'config'
import { PublicWalletXpubs } from 'constants/PublicWalletXpubs'
import type { providers } from 'ethers'
import findIndex from 'lodash/findIndex'
import omit from 'lodash/omit'
import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { isMobile } from 'react-device-detect'
import type { Entropy } from 'context/WalletProvider/KeepKey/components/RecoverySettings'
import { VALID_ENTROPY } from 'context/WalletProvider/KeepKey/components/RecoverySettings'
import { useKeepKeyEventHandler } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyEventHandler'
import { MobileConfig } from 'context/WalletProvider/MobileWallet/config'
import { getWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'
import { portfolio } from 'state/slices/portfolioSlice/portfolioSlice'
import { store } from 'state/store'

import type { ActionTypes } from './actions'
import { WalletActions } from './actions'
import { SUPPORTED_WALLETS } from './config'
import { useKeyringEventHandler } from './KeepKey/hooks/useKeyringEventHandler'
import type { PinMatrixRequestType } from './KeepKey/KeepKeyTypes'
import { setupKeepKeySDK } from './KeepKey/setupKeepKeySdk'
import { KeyManager } from './KeyManager'
import {
  clearLocalWallet,
  getLocalWalletDeviceId,
  getLocalWalletType,
  setLocalNativeWalletName,
  setLocalWalletTypeAndDeviceId,
} from './local-wallet'
import { useNativeEventHandler } from './NativeWallet/hooks/useNativeEventHandler'
import type { IWalletContext } from './WalletContext'
import { WalletContext } from './WalletContext'
import { WalletViewsRouter } from './WalletViewsRouter'

type GenericAdapter = {
  initialize: (...args: any[]) => Promise<any>
  pairDevice: (...args: any[]) => Promise<HDWallet>
}

export type Adapters = Map<KeyManager, GenericAdapter[]>

export type WalletInfo = {
  name: string
  icon: ComponentWithAs<'svg', IconProps>
  deviceId: string
  meta?: { label?: string; address?: string }
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
export type MetaMaskLikeProvider = providers.Web3Provider

// A subset of wallets which have an EIP-1193-like provider
export type KeyManagerWithProvider =
  | KeyManager.XDefi
  | KeyManager.MetaMask
  | KeyManager.WalletConnect
  | KeyManager.Coinbase

export interface InitialState {
  keyring: Keyring
  adapters: Adapters | null
  wallet: HDWallet | null
  modalType: KeyManager | null
  connectedType: KeyManager | null
  initialRoute: string | null
  walletInfo: WalletInfo | null
  isConnected: boolean
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
}

const initialState: InitialState = {
  keyring: new Keyring(),
  adapters: null,
  wallet: null,
  modalType: null,
  connectedType: null,
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
}

export const isKeyManagerWithProvider = (
  keyManager: KeyManager | null,
): keyManager is KeyManagerWithProvider =>
  Boolean(
    keyManager &&
      [
        KeyManager.XDefi,
        KeyManager.MetaMask,
        KeyManager.WalletConnect,
        KeyManager.Coinbase,
      ].includes(keyManager),
  )

const reducer = (state: InitialState, action: ActionTypes): InitialState => {
  switch (action.type) {
    case WalletActions.SET_ADAPTERS:
      return { ...state, adapters: action.payload }
    case WalletActions.SET_WALLET:
      const deviceId = action?.payload?.deviceId
      // set walletId in redux store
      const walletMeta = { walletId: deviceId, walletName: action?.payload?.name }
      store.dispatch(portfolio.actions.setWalletMeta(walletMeta))
      return {
        ...state,
        isDemoWallet: Boolean(action.payload.isDemoWallet),
        wallet: action.payload.wallet,
        connectedType: action.payload.connectedType,
        walletInfo: {
          name: action?.payload?.name,
          icon: action?.payload?.icon,
          deviceId,
          meta: {
            label: action.payload.meta?.label ?? '',
            address: (action.payload.wallet as MetaMaskHDWallet).ethAddress ?? '',
          },
        },
      }
    case WalletActions.SET_PROVIDER:
      return { ...state, provider: action.payload }
    case WalletActions.SET_IS_CONNECTED:
      return { ...state, isConnected: action.payload }
    case WalletActions.SET_IS_LOCKED:
      return { ...state, isLocked: action.payload }
    case WalletActions.SET_CONNECTOR_TYPE:
      return { ...state, modalType: action.payload }
    case WalletActions.SET_INITIAL_ROUTE:
      return { ...state, initialRoute: action.payload }
    case WalletActions.SET_PIN_REQUEST_TYPE:
      return { ...state, keepKeyPinRequestType: action.payload }
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
    case WalletActions.NATIVE_PASSWORD_OPEN:
      return {
        ...state,
        modal: action.payload.modal,
        modalType: KeyManager.Native,
        showBackButton: !state.isLoadingLocalWallet,
        deviceId: action.payload.deviceId,
        initialRoute: '/native/enter-password',
      }
    case WalletActions.OPEN_KEEPKEY_PIN: {
      const { showBackButton, deviceId, pinRequestType } = action.payload
      return {
        ...state,
        modal: true,
        modalType: KeyManager.KeepKey,
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
        modalType: KeyManager.KeepKey,
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
        modalType: KeyManager.KeepKey,
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
        modalType: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.FactoryState,
      }
    case WalletActions.OPEN_KEEPKEY_RECOVERY:
      return {
        ...state,
        modal: true,
        modalType: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.NewRecoverySentence,
      }
    case WalletActions.OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE:
      return {
        ...state,
        modal: true,
        modalType: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.RecoverySentenceInvalid,
      }
    case WalletActions.SET_LOCAL_WALLET_LOADING:
      return { ...state, isLoadingLocalWallet: action.payload }
    case WalletActions.RESET_STATE:
      const resetProperties = omit(initialState, ['keyring', 'adapters', 'modal', 'deviceId'])
      // reset wallet meta in redux store
      store.dispatch(
        portfolio.actions.setWalletMeta({ walletId: undefined, walletName: undefined }),
      )
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
        modalType: KeyManager.KeepKey,
        initialRoute: KeepKeyRoutes.DownloadUpdater,
      }
    case WalletActions.OPEN_KEEPKEY_DISCONNECT:
      return {
        ...state,
        modal: true,
        showBackButton: false,
        modalType: KeyManager.KeepKey,
        initialRoute: KeepKeyRoutes.Disconnect,
      }
    default:
      return state
  }
}

const getInitialState = () => {
  const localWalletType = getLocalWalletType()
  const localWalletDeviceId = getLocalWalletDeviceId()
  if (localWalletType && localWalletDeviceId) {
    /**
     * set isLoadingLocalWallet->true to bypass splash screen
     */
    return {
      ...initialState,
      isLoadingLocalWallet: true,
    }
  }
  return initialState
}

export const WalletProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  // External, exposed state to be consumed with useWallet()
  const [state, dispatch] = useReducer(reducer, getInitialState())
  const isDarkMode = useColorModeValue(false, true)
  // Internal state, for memoization purposes only
  const [walletType, setWalletType] = useState<KeyManagerWithProvider | null>(null)

  const disconnect = useCallback(() => {
    /**
     * in case of KeepKey placeholder wallet,
     * the disconnect function is undefined
     */
    state.wallet?.disconnect?.()
    dispatch({ type: WalletActions.RESET_STATE })
    clearLocalWallet()
  }, [state.wallet])

  const load = useCallback(() => {
    const localWalletType = getLocalWalletType()
    const localWalletDeviceId = getLocalWalletDeviceId()
    if (localWalletType && localWalletDeviceId && state.adapters) {
      ;(async () => {
        if (state.adapters?.has(localWalletType)) {
          // Fixes issue with wallet `type` being null when the wallet is loaded from state
          dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })

          const nativeAdapters = state.adapters.get(KeyManager.Native)

          switch (localWalletType) {
            case KeyManager.Mobile:
              try {
                const w = await getWallet(localWalletDeviceId)
                if (w && w.mnemonic && w.label) {
                  const localMobileWallet = await nativeAdapters?.[0]?.pairDevice(
                    localWalletDeviceId,
                  )

                  if (localMobileWallet) {
                    localMobileWallet.loadDevice({ label: w.label, mnemonic: w.mnemonic })
                    const { name, icon } = MobileConfig
                    dispatch({
                      type: WalletActions.SET_WALLET,
                      payload: {
                        wallet: localMobileWallet,
                        name,
                        icon,
                        deviceId: w.id || localWalletDeviceId,
                        meta: { label: w.label },
                        connectedType: KeyManager.Mobile,
                      },
                    })
                    dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
                    // Turn off the loading spinner for the wallet button in
                    dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
                  } else {
                    disconnect()
                  }
                } else {
                  // in the case we return a null from the mobile app and fail to get the wallet
                  // we want to disconnect and return the user back to the splash screen
                  disconnect()
                }
              } catch (e) {
                console.error(e)
              }
              break
            case KeyManager.Native:
              const localNativeWallet = await nativeAdapters?.[0]?.pairDevice(localWalletDeviceId)
              if (localNativeWallet) {
                /**
                 * This will eventually fire an event, which the ShapeShift wallet
                 * password modal will be shown
                 */
                await localNativeWallet.initialize()
              } else {
                disconnect()
              }
              break
            case KeyManager.KeepKey:
              try {
                const localKeepKeyWallet = await (async () => {
                  const maybeWallet = state.keyring.get(localWalletDeviceId)
                  if (maybeWallet) return maybeWallet
                  const keepKeyAdapters = state.adapters?.get(KeyManager.KeepKey)
                  if (!keepKeyAdapters) return
                  const sdk = await setupKeepKeySDK()
                  return await keepKeyAdapters[0]?.pairDevice(sdk)
                })()

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
                      name,
                      icon,
                      deviceId,
                      meta: { label },
                      connectedType: KeyManager.KeepKey,
                    },
                  })
                  dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
                } else {
                  disconnect()
                }
              } catch (e) {
                disconnect()
              }
              dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
              break
            case KeyManager.MetaMask:
              const localMetaMaskWallet = await state.adapters
                .get(KeyManager.MetaMask)?.[0]
                ?.pairDevice()
              if (localMetaMaskWallet) {
                const { name, icon } = SUPPORTED_WALLETS[KeyManager.MetaMask]
                try {
                  await localMetaMaskWallet.initialize()
                  const deviceId = await localMetaMaskWallet.getDeviceID()
                  dispatch({
                    type: WalletActions.SET_WALLET,
                    payload: {
                      wallet: localMetaMaskWallet,
                      name,
                      icon,
                      deviceId,
                      connectedType: KeyManager.MetaMask,
                    },
                  })
                  dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })
                  dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
                } catch (e) {
                  disconnect()
                }
              } else {
                disconnect()
              }
              dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
              break
            case KeyManager.Coinbase:
              const localCoinbaseWallet = await state.adapters
                .get(KeyManager.Coinbase)?.[0]
                ?.pairDevice()
              if (localCoinbaseWallet) {
                const { name, icon } = SUPPORTED_WALLETS[KeyManager.Coinbase]
                try {
                  await localCoinbaseWallet.initialize()
                  const deviceId = await localCoinbaseWallet.getDeviceID()
                  dispatch({
                    type: WalletActions.SET_WALLET,
                    payload: {
                      wallet: localCoinbaseWallet,
                      name,
                      icon,
                      deviceId,
                      connectedType: KeyManager.Coinbase,
                    },
                  })
                  dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })
                  dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
                } catch (e) {
                  disconnect()
                }
              } else {
                disconnect()
              }
              dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
              break
            case KeyManager.XDefi:
              const localXDEFIWallet = await state.adapters.get(KeyManager.XDefi)?.[0]?.pairDevice()
              if (localXDEFIWallet) {
                const { name, icon } = SUPPORTED_WALLETS[KeyManager.XDefi]
                try {
                  await localXDEFIWallet.initialize()
                  const deviceId = await localXDEFIWallet.getDeviceID()
                  dispatch({
                    type: WalletActions.SET_WALLET,
                    payload: {
                      wallet: localXDEFIWallet,
                      name,
                      icon,
                      deviceId,
                      connectedType: KeyManager.XDefi,
                    },
                  })
                  dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
                } catch (e) {
                  disconnect()
                }
              } else {
                disconnect()
              }
              dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
              break
            case KeyManager.Keplr:
              const localKeplrWallet = await state.adapters.get(KeyManager.Keplr)?.[0]?.pairDevice()
              if (localKeplrWallet) {
                const { name, icon } = SUPPORTED_WALLETS[KeyManager.Keplr]
                try {
                  await localKeplrWallet.initialize()
                  const deviceId = await localKeplrWallet.getDeviceID()
                  dispatch({
                    type: WalletActions.SET_WALLET,
                    payload: {
                      wallet: localKeplrWallet,
                      name,
                      icon,
                      deviceId,
                      connectedType: KeyManager.Keplr,
                    },
                  })
                  dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
                } catch (e) {
                  disconnect()
                }
              } else {
                disconnect()
              }
              dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
              break
            case KeyManager.WalletConnect:
              const localWalletConnectWallet = await state.adapters
                .get(KeyManager.WalletConnect)?.[0]
                ?.pairDevice()
              if (localWalletConnectWallet) {
                const { name, icon } = SUPPORTED_WALLETS[KeyManager.WalletConnect]
                try {
                  await localWalletConnectWallet.initialize()
                  const deviceId = await localWalletConnectWallet.getDeviceID()
                  dispatch({
                    type: WalletActions.SET_WALLET,
                    payload: {
                      wallet: localWalletConnectWallet,
                      name,
                      icon,
                      deviceId,
                      connectedType: KeyManager.WalletConnect,
                    },
                  })
                  dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })
                  dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
                } catch (e) {
                  disconnect()
                }
              } else {
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

  const handleAccountsOrChainChanged = useCallback(async () => {
    if (!walletType || !state.adapters) return

    const localWallet = await state.adapters.get(walletType)?.[0]?.pairDevice()

    if (!localWallet) return

    await localWallet.initialize()
    const deviceId = await localWallet?.getDeviceID()

    if (!deviceId) return

    const { icon, name } = SUPPORTED_WALLETS[walletType]

    dispatch({
      type: WalletActions.SET_WALLET,
      payload: {
        wallet: localWallet,
        name,
        icon,
        deviceId,
        connectedType: walletType,
      },
    })
  }, [state, walletType])

  const setProviderEvents = useCallback(
    async (maybeProvider: InitialState['provider']) => {
      if (!(maybeProvider && walletType)) return

      maybeProvider?.on?.('accountsChanged', handleAccountsOrChainChanged)
      maybeProvider?.on?.('chainChanged', handleAccountsOrChainChanged)

      const wallet = await state.adapters?.get(walletType)?.[0]?.pairDevice()
      if (wallet) {
        const oldDisconnect = wallet.disconnect.bind(wallet)
        wallet.disconnect = () => {
          maybeProvider?.removeListener?.('accountsChanged', handleAccountsOrChainChanged)
          maybeProvider?.removeListener?.('chainChanged', handleAccountsOrChainChanged)
          return oldDisconnect()
        }
      }
    },
    [state.adapters, walletType, handleAccountsOrChainChanged],
  )

  // Register a MetaMask-like (EIP-1193) provider on wallet connect or load
  const onProviderChange = useCallback(
    async (localWalletType: KeyManagerWithProvider | null) => {
      if (!localWalletType) return
      setWalletType(localWalletType)
      if (!walletType) return
      try {
        const maybeProvider = await (async (): Promise<InitialState['provider']> => {
          if (KeyManager.MetaMask === walletType) {
            return (await detectEthereumProvider()) as MetaMaskLikeProvider
          }
          if (walletType === KeyManager.XDefi) {
            try {
              return globalThis?.xfi?.ethereum as unknown as MetaMaskLikeProvider
            } catch (error) {
              throw new Error('walletProvider.xdefi.errors.connectFailure')
            }
          }
          if (walletType === KeyManager.WalletConnect) {
            const config: WalletConnectProviderConfig = {
              /** List of RPC URLs indexed by chain reference */
              rpc: {
                [CHAIN_REFERENCE.EthereumMainnet]: getConfig().REACT_APP_ETHEREUM_NODE_URL,
                [CHAIN_REFERENCE.OptimismMainnet]: getConfig().REACT_APP_OPTIMISM_NODE_URL,
                [CHAIN_REFERENCE.BnbSmartChainMainnet]:
                  getConfig().REACT_APP_BNBSMARTCHAIN_NODE_URL,
                [CHAIN_REFERENCE.GnosisMainnet]: getConfig().REACT_APP_GNOSIS_NODE_URL,
                [CHAIN_REFERENCE.PolygonMainnet]: getConfig().REACT_APP_POLYGON_NODE_URL,
                [CHAIN_REFERENCE.AvalancheCChain]: getConfig().REACT_APP_AVALANCHE_NODE_URL,
              },
            }
            return new WalletConnectProvider(config)
          }

          return null
        })()

        if (maybeProvider) {
          await setProviderEvents(maybeProvider)
          dispatch({ type: WalletActions.SET_PROVIDER, payload: maybeProvider })
        }
      } catch (e) {
        if (!isMobile) console.error(e)
      }
    },
    // Only a change of wallet type should invalidate the reference
    // Else, this will add many duplicate event listeners
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletType],
  )

  useEffect(() => {
    ;(async () => {
      const localWalletType = getLocalWalletType()
      if (!isKeyManagerWithProvider(localWalletType)) return

      await onProviderChange(localWalletType)
    })()
  }, [state.wallet, onProviderChange])

  useEffect(() => {
    if (state.keyring) {
      ;(async () => {
        const adapters: Adapters = new Map()
        for (const keyManager of Object.values(KeyManager)) {
          try {
            type KeyManagerOptions =
              | undefined
              | WalletConnectProviderConfig
              | CoinbaseProviderConfig

            type GetKeyManagerOptions = (keyManager: KeyManager) => KeyManagerOptions

            const getKeyManagerOptions: GetKeyManagerOptions = keyManager => {
              switch (keyManager) {
                case 'walletconnect':
                  return {
                    rpc: {
                      1: getConfig().REACT_APP_ETHEREUM_NODE_URL,
                    },
                  }
                case 'coinbase':
                  return {
                    appName: 'ShapeShift',
                    appLogoUrl: 'https://avatars.githubusercontent.com/u/52928763?s=50&v=4',
                    defaultJsonRpcUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
                    defaultChainId: 1,
                    darkMode: isDarkMode,
                  }
                default:
                  return undefined
              }
            }

            const walletAdapters = await SUPPORTED_WALLETS[keyManager]?.adapters.reduce<
              Promise<GenericAdapter[]>
            >(async (acc, cur) => {
              const adapters = await acc
              const options = getKeyManagerOptions(keyManager)
              const adapter = cur.useKeyring(state.keyring, options)
              try {
                await adapter?.initialize?.()
                adapters.push(adapter)
              } catch (e) {
                console.error(e)
              }
              return acc
            }, Promise.resolve([]))

            adapters.set(keyManager, walletAdapters)
          } catch (e) {
            console.error(e)
          }
        }

        dispatch({ type: WalletActions.SET_ADAPTERS, payload: adapters })
      })()
    }
  }, [isDarkMode, state.keyring])

  const connect = useCallback((type: KeyManager) => {
    // remove existing dapp or wallet connections
    if (type === KeyManager.WalletConnect) localStorage.removeItem('walletconnect')
    dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: type })
    const routeIndex = findIndex(SUPPORTED_WALLETS[type]?.routes, ({ path }) =>
      String(path).endsWith('connect'),
    )
    if (routeIndex > -1) {
      dispatch({
        type: WalletActions.SET_INITIAL_ROUTE,
        payload: SUPPORTED_WALLETS[type].routes[routeIndex].path as string,
      })
    }
  }, [])

  const connectDemo = useCallback(async () => {
    const { name, icon, adapters } = SUPPORTED_WALLETS[KeyManager.Demo]
    // For the demo wallet, we use the name, DemoWallet, as the deviceId
    const deviceId = name
    setLocalWalletTypeAndDeviceId(KeyManager.Demo, deviceId)
    setLocalNativeWalletName(name)
    dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: true })
    const adapterInstance = adapters[0].useKeyring(state.keyring)
    const wallet = (await adapterInstance.pairDevice(deviceId)) as NativeHDWallet
    const { create } = native.crypto.Isolation.Engines.Dummy.BIP39.Mnemonic
    await wallet.loadDevice({
      mnemonic: await create(PublicWalletXpubs),
      deviceId,
    })
    await wallet.initialize()
    dispatch({
      type: WalletActions.SET_WALLET,
      payload: {
        isDemoWallet: true,
        wallet,
        name,
        icon,
        deviceId,
        meta: { label: name },
        connectedType: KeyManager.Demo,
      },
    })
    dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
    dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
  }, [state.keyring])

  const create = useCallback((type: KeyManager) => {
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
  useNativeEventHandler(state, dispatch)
  useKeepKeyEventHandler(state, dispatch, load, setDeviceState)

  const value: IWalletContext = useMemo(
    () => ({
      state,
      dispatch,
      connect,
      create,
      disconnect,
      load,
      setDeviceState,
      onProviderChange,
      connectDemo,
    }),
    [state, connect, create, disconnect, load, setDeviceState, connectDemo, onProviderChange],
  )

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletViewsRouter />
    </WalletContext.Provider>
  )
}
