import { getConfig } from 'config'
import type { InterpolationOptions } from 'node-polyglot'
import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { isMobile } from 'react-device-detect'
import { useSelector } from 'react-redux'
import type { RouteComponentProps } from 'react-router-dom'
import { getSnapVersion } from 'utils/snaps'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { removeAccountsAndChainListeners } from 'context/WalletProvider/WalletProvider'
import {
  checkIsMetaMaskDesktop,
  checkIsMetaMaskImpersonator,
  checkIsMetaMaskMobileWebView,
  checkIsSnapInstalled,
} from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { mipdStore } from 'lib/mipd'
import { selectShowSnapsModal } from 'state/slices/selectors'

import { ConnectModal } from '../../components/ConnectModal'
import { RedirectModal } from '../../components/RedirectModal'
import type { LocationState } from '../../NativeWallet/types'
import { MetaMaskConfig } from '../config'

export interface MetaMaskSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const MetaMaskConnect = ({ history }: MetaMaskSetupProps) => {
  const isMetaMaskMobileWebView = checkIsMetaMaskMobileWebView()
  const {
    dispatch,
    getAdapter,
    onProviderChange,
    state: { modalType },
  } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showSnapModal = useSelector(selectShowSnapsModal)

  const mipdProviders = useSyncExternalStore(mipdStore.subscribe, mipdStore.getProviders)
  const maybeMipdProvider = mipdProviders.find(provider => provider.info.rdns === modalType)

  const headerText: [string, InterpolationOptions] = useMemo(
    () => ['walletProvider.mipd.connect.header', { name: maybeMipdProvider?.info.name }],
    [maybeMipdProvider?.info.name],
  )

  const bodyText: [string, InterpolationOptions] = useMemo(
    () => ['walletProvider.mipd.connect.body', { name: maybeMipdProvider?.info.name }],
    [maybeMipdProvider?.info.name],
  )

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setLoading(false)
  }, [])

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    const adapter = await getAdapter(KeyManager.MetaMask)
    if (adapter) {
      // Remove all provider event listeners from previously connected wallets
      await removeAccountsAndChainListeners()
      const wallet = await adapter.pairDevice()
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error(
          'Call to hdwallet-shapeshift-multichain::pairDevice returned null or undefined',
        )
      }

      const { name, icon } = MetaMaskConfig
      try {
        const deviceId = await wallet.getDeviceID()

        const isLocked = await wallet.isLocked()

        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.MetaMask },
        })
        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          // Do not early return here if (!maybeMipdProvider) - not all wallet announce themselves as EIP-6963 providers
          // and we should let the app work the best it could without them
          payload: { isConnected: true, modalType: maybeMipdProvider?.info.rdns ?? '' },
        })
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })
        localWallet.setLocalWalletTypeAndDeviceId(KeyManager.MetaMask, deviceId)

        const provider = await onProviderChange(KeyManager.MetaMask, wallet)

        if (!provider) {
          throw new Error('walletProvider.metaMask.errors.connectFailure')
        }

        await (async () => {
          const isMetaMaskDesktop = await checkIsMetaMaskDesktop(wallet)
          const isMetaMaskImpersonator = await checkIsMetaMaskImpersonator(wallet)
          // Wallets other than MM desktop - including MM impersonators - don't support MM snaps
          if (!isMetaMaskDesktop || isMetaMaskImpersonator || isMetaMaskMobileWebView)
            return dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          const isSnapInstalled = await checkIsSnapInstalled()

          const snapVersion = await getSnapVersion()

          const isCorrectVersion = snapVersion === getConfig().REACT_APP_SNAP_VERSION

          if (isSnapInstalled && !isCorrectVersion && showSnapModal) {
            return history.push('/metamask/snap/update')
          }
          if (!isSnapInstalled && showSnapModal) {
            return history.push('/metamask/snap/install')
          }

          return dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        })()
      } catch (e: any) {
        if (e?.message?.startsWith('walletProvider.')) {
          console.error(e)
          setErrorLoading(e?.message)
        } else {
          setErrorLoading('walletProvider.metaMask.errors.unknown')
          history.push('/metamask/failure')
        }
      }
    }
    setLoading(false)
  }, [
    getAdapter,
    setErrorLoading,
    dispatch,
    maybeMipdProvider?.info.rdns,
    localWallet,
    onProviderChange,
    isMetaMaskMobileWebView,
    showSnapModal,
    history,
  ])

  const handleRedirect = useCallback((): void => {
    const METAMASK_DEEP_LINK_BASE_URL = 'https://metamask.app.link'
    // This constructs the MetaMask deep-linking target from the currently-loaded
    // window.location. The port will be blank if not specified, in which case it
    // should be omitted.
    const mmDeeplinkTarget = [window.location.hostname, window.location.port]
      .filter(x => !!x)
      .join(':')

    return window.location.assign(`${METAMASK_DEEP_LINK_BASE_URL}/${mmDeeplinkTarget}`)
  }, [])

  return isMobile && !isMetaMaskMobileWebView ? (
    <RedirectModal
      headerText={'walletProvider.metaMask.redirect.header'}
      bodyText={'walletProvider.metaMask.redirect.body'}
      buttonText={'walletProvider.metaMask.redirect.button'}
      onClickAction={handleRedirect}
      loading={loading}
      error={error}
    />
  ) : (
    <ConnectModal
      headerText={headerText}
      bodyText={bodyText}
      buttonText={'walletProvider.mipd.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
