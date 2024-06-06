import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
import detectEthereumProvider from '@metamask/detect-provider'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import type { MetaMaskHDWallet } from '@shapeshiftoss/hdwallet-metamask'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { Dummy } from '@shapeshiftoss/hdwallet-native/dist/crypto/isolation/engines'
import type { EthereumProvider as EthereumProviderType } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider'
import { PublicWalletXpubs } from 'constants/PublicWalletXpubs'
import type { BrowserProvider } from 'ethers'
import findIndex from 'lodash/findIndex'
import omit from 'lodash/omit'
import React, { useCallback, useEffect, useMemo, useReducer } from 'react'
import { isMobile } from 'react-device-detect'
import type { Entropy } from 'context/WalletProvider/KeepKey/components/RecoverySettings'
import { VALID_ENTROPY } from 'context/WalletProvider/KeepKey/components/RecoverySettings'
import { useKeepKeyEventHandler } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyEventHandler'
import { MobileConfig } from 'context/WalletProvider/MobileWallet/config'
import { getWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'
import { useWalletConnectV2EventHandler } from 'context/WalletProvider/WalletConnectV2/useWalletConnectV2EventHandler'
import { isSome } from 'lib/utils'
import { localWalletSlice } from 'state/slices/localWalletSlice/localWalletSlice'
import { selectWalletDeviceId, selectWalletType } from 'state/slices/localWalletSlice/selectors'
import { portfolio } from 'state/slices/portfolioSlice/portfolioSlice'
import { store } from 'state/store'

import type { ActionTypes } from './actions'
import { WalletActions } from './actions'
import { getKeyManagerOptions, SUPPORTED_WALLETS } from './config'
import { useKeyringEventHandler } from './KeepKey/hooks/useKeyringEventHandler'
import type { PinMatrixRequestType } from './KeepKey/KeepKeyTypes'
import { setupKeepKeySDK } from './KeepKey/setupKeepKeySdk'
import { KeyManager } from './KeyManager'
import { useLedgerEventHandler } from './Ledger/hooks/useLedgerEventHandler'
import { useLocalWallet } from './local-wallet'
import { useNativeEventHandler } from './NativeWallet/hooks/useNativeEventHandler'
import { type AdaptersByKeyManager, type GetAdapter, NativeWalletRoutes } from './types'
import type { IWalletContext } from './WalletContext'
import { WalletContext } from './WalletContext'
import { WalletViewsRouter } from './WalletViewsRouter'

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
export type MetaMaskLikeProvider = BrowserProvider

// A subset of wallets which have an EIP-1193-like provider
export type KeyManagerWithProvider =
  | KeyManager.XDefi
  | KeyManager.MetaMask
  | KeyManager.WalletConnectV2
  | KeyManager.Coinbase

export interface InitialState {
  keyring: Keyring
  adapters: Partial<AdaptersByKeyManager>
  wallet: HDWallet | null
  modalType: KeyManager | null
  connectedType: KeyManager | null
  initialRoute: string | null
  walletInfo: WalletInfo | null
  isConnected: boolean
  isDemoWallet: boolean
  provider: MetaMaskLikeProvider | EthereumProviderType | null
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
  adapters: {},
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
        KeyManager.WalletConnectV2,
        KeyManager.Coinbase,
      ].includes(keyManager),
  )

export const removeAccountsAndChainListeners = async () => {
  const providers = Object.values(KeyManager).filter(isKeyManagerWithProvider)
  const maybeProviders = (
    await Promise.all(providers.map(keyManager => getMaybeProvider(keyManager)))
  ).filter(isSome) as BrowserProvider[]

  maybeProviders.forEach(maybeProvider => {
    maybeProvider.removeAllListeners('accountsChanged')
    maybeProvider.removeAllListeners('chainChanged')
  })
}

export const getMaybeProvider = async (
  localWalletType: KeyManager | null,
): Promise<InitialState['provider']> => {
  if (!localWalletType) return null
  if (!isKeyManagerWithProvider(localWalletType)) return null

  if (localWalletType === KeyManager.MetaMask) {
    return (await detectEthereumProvider()) as MetaMaskLikeProvider
  }
  if (localWalletType === KeyManager.XDefi) {
    try {
      return globalThis?.xfi?.ethereum as unknown as MetaMaskLikeProvider
    } catch (error) {
      console.error(error)
      throw new Error('walletProvider.xdefi.errors.connectFailure')
    }
  }

  if (localWalletType === KeyManager.WalletConnectV2) {
    // provider is created when getting the wallet in WalletConnectV2Connect pairDevice
    return null
  }

  return null
}

const reducer = (state: InitialState, action: ActionTypes): InitialState => {
  switch (action.type) {
    case WalletActions.SET_ADAPTERS:
      return { ...state, adapters: action.payload }
    case WalletActions.SET_WALLET:
      const currentConnectedType = state.connectedType
      if (currentConnectedType === 'walletconnectv2') {
        state.wallet?.disconnect?.()
        store.dispatch(localWalletSlice.actions.clearLocalWallet())
      }
      const { deviceId, name, wallet, icon, meta, isDemoWallet, connectedType } = action.payload
      // set wallet metadata in redux store
      const walletMeta = {
        walletId: deviceId,
        walletName: name,
      }
      store.dispatch(portfolio.actions.setWalletMeta(walletMeta))
      return {
        ...state,
        deviceId,
        isDemoWallet: Boolean(isDemoWallet),
        wallet,
        connectedType,
        walletInfo: {
          name,
          icon,
          deviceId,
          meta: {
            label: meta?.label ?? '',
            address: (wallet as MetaMaskHDWallet).ethAddress ?? '',
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
        initialRoute: NativeWalletRoutes.EnterPassword,
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
      store.dispatch(portfolio.actions.setWalletMeta(undefined))
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
  const localWalletType = selectWalletType(store.getState())
  const localWalletDeviceId = selectWalletDeviceId(store.getState())
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
  const {
    localWalletType: walletType,
    localWalletDeviceId,
    setLocalWalletTypeAndDeviceId,
    setLocalNativeWalletName,
  } = useLocalWallet()

  const getAdapter: GetAdapter = useCallback(
    async (keyManager, index = 0) => {
      let currentStateAdapters = state.adapters

      // Check if adapter is already in the state
      let adapterInstance = currentStateAdapters[keyManager]

      if (!adapterInstance) {
        // If not, create a new instance of the adapter
        try {
          const Adapter = await SUPPORTED_WALLETS[keyManager].adapters[index].loadAdapter()
          const keyManagerOptions = getKeyManagerOptions(keyManager, isDarkMode)
          // @ts-ignore tsc is drunk as well, not narrowing to the specific adapter and its KeyManager options here
          // eslint is drunk, this isn't a hook
          // eslint-disable-next-line react-hooks/rules-of-hooks
          adapterInstance = Adapter.useKeyring(state.keyring, keyManagerOptions)

          if (adapterInstance) {
            currentStateAdapters[keyManager] = adapterInstance
            // Set it in wallet state for later use
            dispatch({ type: WalletActions.SET_ADAPTERS, payload: currentStateAdapters })
          }
        } catch (e) {
          console.error(e)
          return null
        }
      }

      if (!adapterInstance) return null

      return adapterInstance
    },
    [isDarkMode, state.adapters, state.keyring],
  )

  const disconnect = useCallback(() => {
    /**
     * in case of KeepKey placeholder wallet,
     * the disconnect function is undefined
     */
    state.wallet?.disconnect?.()
    dispatch({ type: WalletActions.RESET_STATE })
    store.dispatch(localWalletSlice.actions.clearLocalWallet())
  }, [state.wallet])

  // Register a MetaMask-like (EIP-1193) provider on wallet connect or load
  const onProviderChange = useCallback(
    async (
      localWalletType: KeyManagerWithProvider | null,
      // consuming state.wallet in setProviderEvents below won't cut it because of stale closure references
      // so we need to explicitly pass the wallet for which we're setting the provider events
      wallet: HDWallet | null,
    ): Promise<InitialState['provider'] | undefined> => {
      if (!localWalletType) return
      try {
        const maybeProvider = await getMaybeProvider(localWalletType)

        if (maybeProvider) {
          setProviderEvents(maybeProvider, localWalletType, wallet)
          dispatch({ type: WalletActions.SET_PROVIDER, payload: maybeProvider })
          return maybeProvider
        }
      } catch (e) {
        if (!isMobile) console.error(e)
      }
    },
    // avoid being too reactive here and setting too many event listeners with setProviderEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const load = useCallback(() => {
    const localWalletType = walletType

    if (localWalletType && localWalletDeviceId) {
      ;(async () => {
        const currentAdapters = state.adapters ?? ({} as AdaptersByKeyManager)

        switch (localWalletType) {
          case KeyManager.Mobile:
            try {
              // Get the adapter again in each switch case to narrow down the adapter type
              const mobileAdapter = await getAdapter(localWalletType, 0)

              if (mobileAdapter) {
                currentAdapters[localWalletType] = mobileAdapter
                dispatch({ type: WalletActions.SET_ADAPTERS, payload: currentAdapters })
                // Fixes issue with wallet `type` being null when the wallet is loaded from state
                dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })
              }
              const w = await getWallet(localWalletDeviceId)
              if (w && w.mnemonic && w.label) {
                const localMobileWallet = await mobileAdapter?.pairDevice(localWalletDeviceId)

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
            // Get the adapter again in each switch case to narrow down the adapter type
            const nativeAdapter = await getAdapter(localWalletType)
            if (nativeAdapter) {
              currentAdapters[localWalletType] = nativeAdapter
              dispatch({ type: WalletActions.SET_ADAPTERS, payload: currentAdapters })
              // Fixes issue with wallet `type` being null when the wallet is loaded from state
              dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })
            }

            const localNativeWallet = await nativeAdapter?.pairDevice(localWalletDeviceId)
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
          // We don't want to pairDevice() for ledger here - this will run on app load and won't work, as WebUSB `requestPermission` must be
          // called from a user gesture. Instead, we'll pair the device when the user clicks the "Pair Device` button in Ledger `<Connect />`
          // case KeyManager.Ledger:
          // const ledgerWallet = await state.adapters.get(KeyManager.Ledger)?.[0].pairDevice()
          // return ledgerWallet
          case KeyManager.KeepKey:
            try {
              const localKeepKeyWallet = await (async () => {
                const maybeWallet = state.keyring.get(localWalletDeviceId)
                if (maybeWallet) return maybeWallet
                const sdk = await setupKeepKeySDK()
                // Get the adapter again in each switch case to narrow down the adapter type
                // If the SDK is defined, we're in the context of KK desktop and should load the first (REST) adapter
                // Else we should load the second adapter i.e the regular KK WebUSB one
                const keepKeyAdapter = await getAdapter(KeyManager.KeepKey, sdk ? 0 : 1)
                if (!keepKeyAdapter) return

                currentAdapters[localWalletType] = keepKeyAdapter
                dispatch({ type: WalletActions.SET_ADAPTERS, payload: currentAdapters })
                // Fixes issue with wallet `type` being null when the wallet is loaded from state
                dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })

                // @ts-ignore TODO(gomes): FIXME, most likely borked because of WebUSBKeepKeyAdapter
                return await keepKeyAdapter.pairDevice(sdk)
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
            // Get the adapter again in each switch case to narrow down the adapter type
            const metamaskAdapter = await getAdapter(localWalletType)

            if (metamaskAdapter) {
              currentAdapters[localWalletType] = metamaskAdapter
              dispatch({ type: WalletActions.SET_ADAPTERS, payload: currentAdapters })
              // Fixes issue with wallet `type` being null when the wallet is loaded from state
              dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })
            }

            const localMetaMaskWallet = await metamaskAdapter?.pairDevice()
            // Set the provider again on refresh to ensure event handlers are properly set
            await onProviderChange(KeyManager.MetaMask, localMetaMaskWallet ?? null)
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
            // Get the adapter again in each switch case to narrow down the adapter type
            const coinbaseAdapter = await getAdapter(localWalletType)

            if (coinbaseAdapter) {
              currentAdapters[localWalletType] = coinbaseAdapter
              dispatch({ type: WalletActions.SET_ADAPTERS, payload: currentAdapters })
              // Fixes issue with wallet `type` being null when the wallet is loaded from state
              dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })
            }

            const localCoinbaseWallet = await coinbaseAdapter?.pairDevice()
            // Set the provider again on refresh to ensure event handlers are properly set
            await onProviderChange(KeyManager.Coinbase, localCoinbaseWallet ?? null)
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
            // Get the adapter again in each switch case to narrow down the adapter type
            const xdefiAdapter = await getAdapter(localWalletType)

            if (xdefiAdapter) {
              currentAdapters[localWalletType] = xdefiAdapter
              dispatch({ type: WalletActions.SET_ADAPTERS, payload: currentAdapters })
              // Fixes issue with wallet `type` being null when the wallet is loaded from state
              dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })
            }

            const localXDEFIWallet = await xdefiAdapter?.pairDevice()
            // Set the provider again on refresh to ensure event handlers are properly set
            await onProviderChange(KeyManager.XDefi, localXDEFIWallet ?? null)
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
            // Get the adapter again in each switch case to narrow down the adapter type
            const keplrAdapter = await getAdapter(localWalletType)

            if (keplrAdapter) {
              currentAdapters[localWalletType] = keplrAdapter
              dispatch({ type: WalletActions.SET_ADAPTERS, payload: currentAdapters })
              // Fixes issue with wallet `type` being null when the wallet is loaded from state
              dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })
            }

            const localKeplrWallet = await keplrAdapter?.pairDevice()
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
          case KeyManager.WalletConnectV2: {
            // Get the adapter again in each switch case to narrow down the adapter type
            const walletConnectV2Adapter = await getAdapter(localWalletType)

            if (walletConnectV2Adapter) {
              currentAdapters[localWalletType] = walletConnectV2Adapter
              dispatch({ type: WalletActions.SET_ADAPTERS, payload: currentAdapters })
              // Fixes issue with wallet `type` being null when the wallet is loaded from state
              dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: localWalletType })
            }

            const localWalletConnectWallet = await walletConnectV2Adapter?.pairDevice()
            // Re-trigger the modal on refresh
            await onProviderChange(KeyManager.WalletConnectV2, localWalletConnectWallet ?? null)
            if (localWalletConnectWallet) {
              const { name, icon } = SUPPORTED_WALLETS[KeyManager.WalletConnectV2]
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
                    connectedType: KeyManager.WalletConnectV2,
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
          }
          default:
            /**
             * The fall-through case also handles clearing
             * any demo wallet state on refresh/rerender.
             */
            disconnect()
            break
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.adapters, state.keyring])

  const handleAccountsOrChainChanged = useCallback(
    async (localWalletType: KeyManagerWithProvider | null, accountsOrChains: string[] | string) => {
      if (!localWalletType || !state.adapters) return

      // Note, we NEED to use store.getState instead of the walletType variable above
      // The reason is handleAccountsOrChainChanged exists in the context of a closure, hence will keep a stale reference forever
      const _walletType = selectWalletType(store.getState())

      // This shouldn't happen if event listeners are properly removed, but they may not be
      // This fixes the case of switching from e.g MM, to another wallet, then switching accounts/chains in MM and MM becoming connected again
      if (_walletType && localWalletType !== _walletType) return

      const _isLocked = Array.isArray(accountsOrChains) && accountsOrChains.length === 0

      if (_isLocked) {
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: true })
        // Don't continue execution in case the wallet got locked, set it to locked and abort instead
        return
      }

      // Either a change change or a wallet unlock - ensure we set isLocked to false before continuing to avoid bad states
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })

      const adapter = await getAdapter(localWalletType)
      const localWallet = await adapter?.pairDevice()

      if (!localWallet) return

      await localWallet.initialize()
      const deviceId = await localWallet?.getDeviceID()

      if (!deviceId) return

      const { icon, name } = SUPPORTED_WALLETS[localWalletType]

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet: localWallet,
          name,
          icon,
          deviceId,
          connectedType: localWalletType,
        },
      })
    },
    [getAdapter, state.adapters],
  )

  const setProviderEvents = useCallback(
    (
      maybeProvider: InitialState['provider'],
      localWalletType: KeyManagerWithProvider | null,
      // consuming state.wallet in setProviderEvents below won't cut it because of stale closure references
      // so we need to explicitly pass the wallet for which we're setting the provider events
      wallet: HDWallet | null,
    ) => {
      if (!(maybeProvider && localWalletType)) return

      maybeProvider?.on?.('accountsChanged', (e: string[]) => {
        return handleAccountsOrChainChanged(localWalletType, e)
      })
      maybeProvider?.on?.('chainChanged', (e: string) => {
        return handleAccountsOrChainChanged(localWalletType, e)
      })

      if (wallet) {
        const oldDisconnect = wallet.disconnect.bind(wallet)
        const removeEventListeners = () => {
          maybeProvider?.removeListener?.('accountsChanged', (e: string[]) =>
            handleAccountsOrChainChanged(localWalletType, e),
          )
          maybeProvider?.removeListener?.('chainChanged', (e: string) =>
            handleAccountsOrChainChanged(localWalletType, e),
          )
        }

        wallet.disconnect = () => {
          removeEventListeners()
          return oldDisconnect()
        }
      }
    },
    [handleAccountsOrChainChanged],
  )

  const connect = useCallback((type: KeyManager) => {
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

    try {
      const Adapter = await adapters[0].loadAdapter()
      // eslint is drunk, this isn't a hook
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const adapterInstance = Adapter.useKeyring(state.keyring)

      const wallet = (await adapterInstance.pairDevice(deviceId)) as NativeHDWallet
      const { create } = Dummy.BIP39.Mnemonic
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
    } catch (error) {
      console.error(error)
    } finally {
      dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
    }
  }, [setLocalNativeWalletName, setLocalWalletTypeAndDeviceId, state.keyring])

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

  const importWallet = useCallback((type: KeyManager) => {
    dispatch({ type: WalletActions.SET_CONNECTOR_TYPE, payload: type })
    const routeIndex = findIndex(SUPPORTED_WALLETS[type]?.routes, ({ path }) =>
      String(path).endsWith('import'),
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

  useEffect(() => load(), [load, state.keyring])

  useKeyringEventHandler(state)
  useNativeEventHandler(state, dispatch)
  useWalletConnectV2EventHandler(state, dispatch)
  useKeepKeyEventHandler(state, dispatch, load, setDeviceState)
  useLedgerEventHandler(state, dispatch, load, setDeviceState)

  const value: IWalletContext = useMemo(
    () => ({
      state,
      getAdapter,
      dispatch,
      connect,
      create,
      importWallet,
      disconnect,
      load,
      setDeviceState,
      onProviderChange,
      connectDemo,
    }),
    [
      state,
      getAdapter,
      connect,
      create,
      importWallet,
      disconnect,
      load,
      setDeviceState,
      onProviderChange,
      connectDemo,
    ],
  )

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletViewsRouter />
    </WalletContext.Provider>
  )
}
