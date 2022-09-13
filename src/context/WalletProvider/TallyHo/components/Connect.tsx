import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import type { TallyHoHDWallet } from '@shapeshiftoss/hdwallet-tallyho'
import React, { useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'

import { ConnectModal } from '../../components/ConnectModal'
import { RedirectModal } from '../../components/RedirectModal'
import type { LocationState } from '../../NativeWallet/types'
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
  const { dispatch, state, onProviderChange } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  useEffect(() => {
    ;(async () => {
      await onProviderChange(KeyManager.TallyHo)
    })()
  }, [onProviderChange])

  const pairDevice = async () => {
    setError(null)
    setLoading(true)

    if (!state.provider) {
      throw new Error('walletProvider.tally.errors.connectFailure')
    }

    //Handles UX issues caused by MM and Tally Ho both being injected.
    if (!state.provider.isTally) {
      setErrorLoading('walletProvider.tallyHo.errors.tallyNotInstalledOrSetToDefault')
      throw new Error('Tally Ho either not installed or not set to default')
    }

    if (state.adapters && state.adapters?.has(KeyManager.TallyHo)) {
      const wallet = (await state.adapters.get(KeyManager.TallyHo)?.pairDevice()) as TallyHoHDWallet
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Call to hdwallet-tally::pairDevice returned null or undefined')
      }

      const { name, icon } = TallyHoConfig
      try {
        const deviceId = await wallet.getDeviceID()

        // Switch to Mainnet if wallet is on any other chain
        const chainId = await wallet.ethGetChainId?.()
        if (bnOrZero(chainId).toString() !== CHAIN_REFERENCE.EthereumMainnet) {
          throw new Error('walletProvider.tallyHo.errors.network')
        }

        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId },
        })
        dispatch({ type: WalletActions.SET_IS_DEMO_WALLET, payload: false })
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
  return !state.provider && isMobile ? (
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
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    ></ConnectModal>
  )
}
