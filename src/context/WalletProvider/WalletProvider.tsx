import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import { HDWallet, Keyring } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskHDWallet } from '@shapeshiftoss/hdwallet-metamask'
import * as native from '@shapeshiftoss/hdwallet-native'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { PortisHDWallet } from '@shapeshiftoss/hdwallet-portis'
import { WalletConnectProviderConfig } from '@shapeshiftoss/hdwallet-walletconnect'
import { TallyHoHDWallet } from '@shapeshiftoss/hdwallet-tallyho'
import { XDEFIHDWallet } from '@shapeshiftoss/hdwallet-xdefi'
import { getConfig } from 'config'
import { PublicWalletXpubs } from 'constants/PublicWalletXpubs'
import findIndex from 'lodash/findIndex'
import omit from 'lodash/omit'
import React, { useCallback, useEffect, useMemo, useReducer } from 'react'
import { Entropy, VALID_ENTROPY } from 'context/WalletProvider/KeepKey/components/RecoverySettings'
import { useKeepKeyEventHandler } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyEventHandler'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { ActionTypes, WalletActions } from './actions'
import { SUPPORTED_WALLETS } from './config'
import { useKeyringEventHandler } from './KeepKey/hooks/useKeyringEventHandler'
import { PinMatrixRequestType } from './KeepKey/KeepKeyTypes'
import { KeyManager } from './KeyManager'
import {
  clearLocalWallet,
  getLocalWalletDeviceId,
  getLocalWalletType,
  setLocalNativeWalletName,
  setLocalWalletTypeAndDeviceId,
} from './local-wallet'
import { useNativeEventHandler } from './NativeWallet/hooks/useNativeEventHandler'
import { IWalletContext, WalletContext } from './WalletContext'
import { WalletViewsRouter } from './WalletViewsRouter'

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
}

const initialDeviceState: DeviceState = {
  awaitingDeviceInteraction: false,
  lastDeviceInteractionStatus: undefined,
  disposition: undefined,
  recoverWithPassphrase: undefined,
  recoveryEntropy: VALID_ENTROPY[0],
  recoveryCharacterIndex: undefined,
  recoveryWordIndex: undefined,
}

export interface InitialState {
  keyring: Keyring
  adapters: Adapters | null
  wallet: HDWallet | null
  type: KeyManager | null
  initialRoute: string | null
  walletInfo: WalletInfo | null
  isConnected: boolean
  isLocked: boolean
  modal: boolean
  isLoadingLocalWallet: boolean
  deviceId: string
  showBackButton: boolean
  keepKeyPinRequestType: PinMatrixRequestType | null
  deviceState: DeviceState
}

const initialState: InitialState = {
  keyring: new Keyring(),
  adapters: null,
  wallet: null,
  type: null,
  initialRoute: null,
  walletInfo: null,
  isConnected: false,
  isLocked: false,
  modal: false,
  isLoadingLocalWallet: false,
  deviceId: '',
  showBackButton: true,
  keepKeyPinRequestType: null,
  deviceState: initialDeviceState,
}

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
          deviceId: action?.payload?.deviceId,
          meta: {
            label: action.payload.meta?.label ?? '',
            address: (action.payload.wallet as MetaMaskHDWallet | PortisHDWallet).ethAddress ?? '',
          },
        },
      }
    case WalletActions.SET_IS_CONNECTED:
      return { ...state, isConnected: action.payload }
    case WalletActions.SET_IS_LOCKED:
      return { ...state, isLocked: action.payload }
    case WalletActions.SET_CONNECTOR_TYPE:
      return { ...state, type: action.payload }
    case WalletActions.SET_INITIAL_ROUTE:
      return { ...state, initialRoute: action.payload }
    case WalletActions.SET_DEVICE_STATE:
      const { deviceState } = state
      const {
        awaitingDeviceInteraction = deviceState.awaitingDeviceInteraction,
        lastDeviceInteractionStatus = deviceState.lastDeviceInteractionStatus,
        disposition = deviceState.disposition,
        recoverWithPassphrase = deviceState.recoverWithPassphrase,
        recoveryEntropy = deviceState.recoveryEntropy,
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
        },
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
        type: KeyManager.KeepKey,
        deviceId: action.payload.deviceId,
        initialRoute: KeepKeyRoutes.WipeSuccessful,
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
    default:
      return state
  }
}

const getInitialState = () => {
  const localWalletType = getLocalWalletType()
  const localWalletDeviceId = getLocalWalletDeviceId()
  //Handle Tally Default bug - When user toggles TallyHo default button before disconnecting connected wallet
  if (
    (localWalletType === 'metamask' && (window as any)?.ethereum?.isTally) ||
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
  const [state, dispatch] = useReducer(reducer, getInitialState())

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
          switch (localWalletType) {
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
              if (localWalletType === 'metamask' && (window as any)?.ethereum?.isTally) disconnect()
              const localMetaMaskWallet = (await state.adapters
                .get(KeyManager.MetaMask)
                ?.pairDevice()) as MetaMaskHDWallet
              if (localMetaMaskWallet) {
                const chainId = await localMetaMaskWallet.ethGetChainId?.()
                if (bnOrZero(chainId).toString() !== CHAIN_REFERENCE.EthereumMainnet) {
                  try {
                    await localMetaMaskWallet.ethSwitchChain?.(
                      bn(CHAIN_REFERENCE.EthereumMainnet).toNumber(),
                    )
                  } catch (e) {
                    disconnect()
                  }
                }
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
              const localTallyHoWallet = (await state.adapters
                .get(KeyManager.TallyHo)
                ?.pairDevice()) as TallyHoHDWallet
              if (localTallyHoWallet) {
                const chainId = await localTallyHoWallet.ethGetChainId?.()
                if (bnOrZero(chainId).toString() !== CHAIN_REFERENCE.EthereumMainnet) {
                  // TODO: Remove this comment when Tally multi-chain support is released
                  // This block is currently unreachable, Tally multi-chain support is currently under development
                  // Until this is supported in the published Tally extension, users will never be in a chain other than mainnet
                  await localTallyHoWallet.ethSwitchChain?.(
                    bn(CHAIN_REFERENCE.EthereumMainnet).toNumber(),
                  )
                }
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
              const localXDEFIWallet = (await state.adapters
                .get(KeyManager.XDefi)
                ?.pairDevice()) as XDEFIHDWallet
              if (localXDEFIWallet) {
                const chainId = await localXDEFIWallet.ethGetChainId?.()
                if (bnOrZero(chainId).toString() !== CHAIN_REFERENCE.EthereumMainnet) {
                  await localXDEFIWallet.ethSwitchChain?.(
                    bn(CHAIN_REFERENCE.EthereumMainnet).toNumber(),
                  )
                }
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
            console.error('Error initializing HDWallet adapters', e)
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
      connectDemo,
    }),
    [state, connect, create, disconnect, load, setDeviceState, connectDemo],
  )

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletViewsRouter />
    </WalletContext.Provider>
  )
}
