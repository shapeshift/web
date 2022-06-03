import detectEthereumProvider from '@metamask/detect-provider'
import React, { useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { RouteComponentProps } from 'react-router-dom'
import { ActionTypes, WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { ConnectModal } from '../../components/ConnectModal'
import { RedirectModal } from '../../components/RedirectModal'
import { LocationState } from '../../NativeWallet/types'
import { TallyHoConfig } from '../config'

export interface TallyHoSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

const moduleLogger = logger.child({ namespace: ['NativeWallet'] })

export const TallyHoConnect = ({ history }: TallyHoSetupProps) => {
  const { dispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<any>()

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  useEffect(() => {
    ;(async () => {
      try {
        setProvider(await detectEthereumProvider())
      } catch (e) {
        if (!isMobile) moduleLogger.error({ e }, 'could not detect ethereum provider')
      }
    })()
  }, [setProvider])

  const pairDevice = async () => {
    setError(null)
    setLoading(true)

    if (!provider) {
      throw new Error('walletProvider.tally.errors.connectFailure')
    }

    //Handles UX issues caused by MM and Tally Ho both being injected.
    if (!provider.isTally) {
      setErrorLoading('walletProvider.tallyHo.errors.tallyNotInstalledOrSetToDefault')
      throw new Error('Tally Ho either not installed or not set to default')
    }

    if (state.adapters && state.adapters?.has(KeyManager.TallyHo)) {
      const wallet = await state.adapters.get(KeyManager.TallyHo)?.pairDevice()
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Call to hdwallet-tally::pairDevice returned null or undefined')
      }

      const { name, icon } = TallyHoConfig
      try {
        const deviceId = await wallet.getDeviceID()

        if (provider?.chainId !== '0x1') {
          throw new Error('walletProvider.tallyHo.errors.network')
        }

        // Hack to handle Tally account changes
        //TODO: handle this properly
        const resetState = () => dispatch({ type: WalletActions.RESET_STATE })
        provider?.on?.('accountsChanged', resetState)
        provider?.on?.('chainChanged', resetState)

        const oldDisconnect = wallet.disconnect.bind(wallet)
        wallet.disconnect = () => {
          provider?.removeListener?.('accountsChanged', resetState)
          provider?.removeListener?.('chainChanged', resetState)
          return oldDisconnect()
        }

        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.TallyHo, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e: any) {
        if (e?.message?.startsWith('walletProvider.')) {
          moduleLogger.error({ e }, 'error initializing wallet')
          setErrorLoading(e?.message)
        } else {
          setErrorLoading('walletProvider.tallyHo.errors.unknown')
          history.push('/tallyho/failure')
        }
      }
    }
    setLoading(false)
  }

  // This constructs the Tally deep-linking target from the currently-loaded
  // window.location. The port will be blank if not specified, in which case it
  // should be omitted.
  const tallyHoDeeplinkTarget = [window.location.hostname, window.location.port]
    .filter(x => !!x)
    .join(':')

  // The MM mobile app itself injects a provider, so we'll use pairDevice once
  // we've reopened ourselves in that environment.
  return !provider && isMobile ? (
    <RedirectModal
      headerText={'walletProvider.tallyHo.redirect.header'}
      bodyText={'walletProvider.tallyHo.redirect.body'}
      buttonText={'walletProvider.tallyHo.redirect.button'}
      onClickAction={(): any => {
        moduleLogger.trace({ tallyHoDeeplinkTarget }, 'redirect')
        window.location.assign(`https://tallyho.app.link/dapp/${tallyHoDeeplinkTarget}`)
      }}
      loading={loading}
      error={error}
    ></RedirectModal>
  ) : (
    <ConnectModal
      headerText={'walletProvider.tallyHo.connect.header'}
      bodyText={'walletProvider.tallyHo.connect.body'}
      buttonText={'walletProvider.tallyHo.connect.button'}
      pairDevice={pairDevice}
      loading={loading}
      error={error}
    ></ConnectModal>
  )
}
