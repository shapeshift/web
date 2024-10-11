import { getConfig } from 'config'
import uniqBy from 'lodash/uniqBy'
import type { InterpolationOptions } from 'node-polyglot'
import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import type { RouteComponentProps } from 'react-router-dom'
import { getSnapVersion } from 'utils/snaps'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import {
  checkIsMetaMaskDesktop,
  checkIsMetaMaskMobileWebView,
  checkIsSnapInstalled,
} from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { METAMASK_RDNS, mipdStore, staticMipdProviders } from 'lib/mipd'
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
  const translate = useTranslate()
  const isMetaMaskMobileWebView = checkIsMetaMaskMobileWebView()
  const {
    dispatch,
    getAdapter,
    state: { modalType },
  } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showSnapModal = useSelector(selectShowSnapsModal)

  const detectedMipdProviders = useSyncExternalStore(mipdStore.subscribe, mipdStore.getProviders)
  const mipdProviders = useMemo(
    () => uniqBy(detectedMipdProviders.concat(staticMipdProviders), 'info.rdns'),
    [detectedMipdProviders],
  )
  const maybeMipdProvider = mipdProviders.find(provider => provider.info.rdns === modalType)

  const headerText: [string, InterpolationOptions] = useMemo(
    () => [
      'walletProvider.mipd.connect.header',
      { name: maybeMipdProvider?.info.name ?? 'MetaMask' },
    ],
    [maybeMipdProvider?.info.name],
  )

  const bodyText: [string, InterpolationOptions] = useMemo(
    () => [
      'walletProvider.mipd.connect.body',
      { name: maybeMipdProvider?.info.name ?? 'MetaMask' },
    ],
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
    if (!maybeMipdProvider?.provider) {
      if (modalType === 'io.xdefi') window.open('https://www.xdefi.io/', '_blank')
      if (modalType === 'io.rabby') window.open('https://rabby.io/', '_blank')
    }
    if (adapter) {
      try {
        const wallet = await adapter.pairDevice()
        if (!wallet) {
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error(
            'Call to hdwallet-metamask-multichain::pairDevice returned null or undefined',
          )
        }

        const { name, icon } = MetaMaskConfig
        const deviceId = await wallet.getDeviceID()

        const isLocked = await wallet.isLocked()

        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.MetaMask },
        })
        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })

        if (!maybeMipdProvider?.provider) {
          throw new Error(
            translate('walletProvider.mipd.errors.connectFailure', {
              name: maybeMipdProvider?.info.name ?? 'MetaMask',
            }),
          )
        }

        localWallet.setLocalWallet({
          type: KeyManager.MetaMask,
          deviceId,
          rdns: maybeMipdProvider?.info.rdns,
        })

        await (async () => {
          const isMetaMaskDesktop = checkIsMetaMaskDesktop(wallet)
          // Wallets other than MM desktop don't support MM snaps
          if (!isMetaMaskDesktop || isMetaMaskMobileWebView)
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
          setErrorLoading(
            translate('walletProvider.mipd.errors.unknown', {
              name: maybeMipdProvider?.info.name ?? 'MetaMask',
            }),
          )
          history.push('/metamask/failure')
        }
      }
    }
    setLoading(false)
  }, [
    getAdapter,
    maybeMipdProvider?.provider,
    maybeMipdProvider?.info.rdns,
    maybeMipdProvider?.info.name,
    modalType,
    dispatch,
    localWallet,
    setErrorLoading,
    translate,
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

  return isMobile && !isMetaMaskMobileWebView && modalType === METAMASK_RDNS ? (
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
