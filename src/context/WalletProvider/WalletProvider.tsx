import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import detectEthereumProvider from '@metamask/detect-provider'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import type { MetaMaskHDWallet } from '@shapeshiftoss/hdwallet-metamask'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import * as native from '@shapeshiftoss/hdwallet-native'
import type { PortisHDWallet } from '@shapeshiftoss/hdwallet-portis'
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
import { logger } from 'lib/logger'

import type { ActionTypes } from './actions'
import { WalletActions } from './actions'
import { SUPPORTED_WALLETS } from './config'
import { useKeyringEventHandler } from './KeepKey/hooks/useKeyringEventHandler'
import type { PinMatrixRequestType } from './KeepKey/KeepKeyTypes'
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

// A subset of wallets which have an EIP-1193-like provider
export type KeyManagerWithProvider =
  | KeyManager.TallyHo
  | KeyManager.XDefi
  | KeyManager.MetaMask
  | KeyManager.WalletConnect

export interface InitialState {
  keyring: Keyring
  adapters: Adapters | null
  wallet: HDWallet | null
  type: KeyManager | null
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
  type: null,
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
        KeyManager.TallyHo,
        KeyManager.XDefi,
        KeyManager.MetaMask,
        KeyManager.WalletConnect,
      ].includes(keyManager),
  )

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
            address: (action.payload.wallet as MetaMaskHDWallet | PortisHDWallet).ethAddress ?? '',
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
      return { ...state, type: action.payload }
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
        type: KeyManager.Native,
        showBackButton: !state.isLoadingLocalWallet,
        deviceId: action.payload.deviceId,
        initialRoute: '/native/enter-password',
      }
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
    case WalletActions.OPEN_KEEPKEY_RECOVERY:
      return {
        ...state,
        modal: true,
        type: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.NewRecoverySentence,
      }
    case WalletActions.OPEN_KEEPKEY_RECOVERY_SYNTAX_FAILURE:
      return {
        ...state,
        modal: true,
        type: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.RecoverySentenceInvalid,
      }
    case WalletActions.SET_LOCAL_WALLET_LOADING:
      return { ...state, isLoadingLocalWallet: action.payload }
    case WalletActions.RESET_STATE:
      const resetProperties = omit(initialState, ['keyring', 'adapters', 'modal', 'deviceId'])
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

const getInitialState = () => {
  const localWalletType = getLocalWalletType()
  const localWalletDeviceId = getLocalWalletDeviceId()
  //Handle Tally Default bug - When user toggles TallyHo default button before disconnecting connected wallet
  if (
    (localWalletType === 'metamask' && (window?.ethereum as MetaMaskLikeProvider)?.isTally) ||
    (localWalletType === 'tallyho' && window?.ethereum?.isMetaMask)
  )
    return initialState
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
    const fnLogger = moduleLogger.child({ fn: ['load'] })

    const localWalletType = getLocalWalletType()
    const localWalletDeviceId = getLocalWalletDeviceId()
    fnLogger.trace({ localWalletType, localWalletDeviceId }, 'Load local wallet')
    if (localWalletType && localWalletDeviceId && state.adapters) {
      ;(async () => {
        if (state.adapters?.has(localWalletType)) {
          // Fixes issue with wallet `type` being null when the wallet is loaded from state
          dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })

          switch (localWalletType) {
            case KeyManager.Mobile:
              try {
                const w = await getWallet(localWalletDeviceId)
                fnLogger.trace({ id: w?.id, label: w?.label }, 'Found mobile wallet')
                if (w && w.mnemonic && w.label) {
                  const localMobileWallet = await state.adapters
                    .get(KeyManager.Native)
                    ?.pairDevice(localWalletDeviceId)

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
                moduleLogger.child({ name: 'load' }).error(e, 'Error loading mobile wallet')
              }
              break
            case KeyManager.Native:
              const localNativeWallet = await state.adapters
                .get(KeyManager.Native)
                ?.pairDevice(localWalletDeviceId)
              if (localNativeWallet) {
                /**
                 * This will eventually fire an event, which the native wallet
                 * password modal will be shown
                 */
                await localNativeWallet.initialize()
              } else {
                disconnect()
              }
              break
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
            case KeyManager.Portis:
              const localPortisWallet = await state.adapters.get(KeyManager.Portis)?.pairDevice()
              if (localPortisWallet) {
                const { name, icon } = SUPPORTED_WALLETS[KeyManager.Portis]
                try {
                  await localPortisWallet.initialize()
                  const deviceId = await localPortisWallet.getDeviceID()
                  dispatch({
                    type: WalletActions.SET_WALLET,
                    payload: {
                      wallet: localPortisWallet,
                      name,
                      icon,
                      deviceId,
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
            case KeyManager.MetaMask:
              //Handle refresh bug - when a user changes TallyHo to default, is connected to MM and refreshs the page
              if (
                localWalletType === 'metamask' &&
                (window?.ethereum as MetaMaskLikeProvider)?.isTally
              )
                disconnect()
              const localMetaMaskWallet = await state.adapters
                .get(KeyManager.MetaMask)
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
            case KeyManager.TallyHo:
              //Handle refresh bug - when a user changes TallyHo from default, is connected to TallyHo and refreshs the page
              if (localWalletType === 'tallyho' && window?.ethereum?.isMetaMask) disconnect()
              const localTallyHoWallet = await state.adapters.get(KeyManager.TallyHo)?.pairDevice()
              if (localTallyHoWallet) {
                const { name, icon } = SUPPORTED_WALLETS[KeyManager.TallyHo]
                try {
                  await localTallyHoWallet.initialize()
                  const deviceId = await localTallyHoWallet.getDeviceID()
                  dispatch({
                    type: WalletActions.SET_WALLET,
                    payload: {
                      wallet: localTallyHoWallet,
                      name,
                      icon,
                      deviceId,
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
            case KeyManager.XDefi:
              const localXDEFIWallet = await state.adapters.get(KeyManager.XDefi)?.pairDevice()
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
              const localKeplrWallet = await state.adapters.get(KeyManager.Keplr)?.pairDevice()
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
                .get(KeyManager.WalletConnect)
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

    const localWallet = await state.adapters.get(walletType)?.pairDevice()

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
      },
    })
  }, [state, walletType])

  const setProviderEvents = useCallback(
    async (maybeProvider: InitialState['provider']) => {
      if (!(maybeProvider && walletType)) return

      maybeProvider?.on?.('accountsChanged', handleAccountsOrChainChanged)
      maybeProvider?.on?.('chainChanged', handleAccountsOrChainChanged)

      const wallet = await state.adapters?.get(walletType)?.pairDevice()
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
          if ([KeyManager.MetaMask, KeyManager.TallyHo].includes(walletType)) {
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
              /** List of RPC URLs indexed by chain ID */
              rpc: {
                1: getConfig().REACT_APP_ETHEREUM_NODE_URL,
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
        if (!isMobile) moduleLogger.error(e, 'onProviderChange error')
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
        let options: undefined | { portisAppId: string } | WalletConnectProviderConfig
        for (const wallet of Object.values(KeyManager)) {
          try {
            switch (wallet) {
              case 'portis':
                options = { portisAppId: getConfig().REACT_APP_PORTIS_DAPP_ID }
                break
              case 'walletconnect':
                options = {
                  rpc: {
                    1: getConfig().REACT_APP_ETHEREUM_NODE_URL,
                  },
                }
                break
              default:
                break
            }
            const adapter = SUPPORTED_WALLETS[wallet].adapter.useKeyring(state.keyring, options)
            adapters.set(wallet, adapter)
            // useKeyring returns the instance of the adapter. We'll keep it for future reference.
            await adapter.initialize?.()
            adapters.set(wallet, adapter)
          } catch (e) {
            moduleLogger.error(e, 'Error initializing HDWallet adapters')
          }
        }

        dispatch({ type: WalletActions.SET_ADAPTERS, payload: adapters })
      })()
    }
  }, [state.keyring])

  const connect = useCallback(async (type: KeyManager) => {
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
    const { name, icon, adapter } = SUPPORTED_WALLETS[KeyManager.Demo]
    // For the demo wallet, we use the name, DemoWallet, as the deviceId
    const deviceId = name
    setLocalWalletTypeAndDeviceId(KeyManager.Demo, deviceId)
    setLocalNativeWalletName(name)
    dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: true })
    const adapterInstance = adapter.useKeyring(state.keyring)
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
      },
    })
    dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
    dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
  }, [state.keyring])

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
