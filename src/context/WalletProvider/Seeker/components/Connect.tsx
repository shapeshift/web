import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConnectModal } from '../../components/ConnectModal'
import { SEEKER_DEFAULT_CLUSTER, SeekerConfig } from '../config'
import {
  checkSeekerAvailability,
  seekerAuthorize,
  seekerDeauthorize,
  seekerGetAddress,
  seekerGetPublicKey,
  seekerGetStatus,
  seekerSignAndSendTransaction,
  seekerSignMessage,
  seekerSignTransaction,
} from '../seekerMessageHandlers'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const SeekerConnect = () => {
  const navigate = useNavigate()
  const { dispatch } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setLoading(false)
  }, [])

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const authResult = await seekerAuthorize(SEEKER_DEFAULT_CLUSTER)

      if (!authResult.success || !authResult.address) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        throw new Error('Seeker authorization failed or returned no address')
      }

      const { SeekerHDWallet } = await import('@shapeshiftoss/hdwallet-seeker')

      const messageHandler = {
        checkAvailability: checkSeekerAvailability,
        authorize: seekerAuthorize,
        deauthorize: seekerDeauthorize,
        getAddress: seekerGetAddress,
        getStatus: seekerGetStatus,
        signTransaction: seekerSignTransaction,
        signAndSendTransaction: seekerSignAndSendTransaction,
        getPublicKey: seekerGetPublicKey,
        signMessage: seekerSignMessage,
      }

      const deviceId = `seeker:${authResult.address}`
      const wallet = new SeekerHDWallet(deviceId, authResult.address, messageHandler)

      const { icon } = SeekerConfig
      const name = authResult.label || SeekerConfig.name
      await wallet.initialize()

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Seeker },
      })
      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })
      localWallet.setLocalWallet({ type: KeyManager.Seeker, deviceId })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: any) {
      console.error(e, 'Seeker Connect: There was an error initializing the wallet')
      setErrorLoading(e.message)
      navigate('/seeker/failure')
    }

    setLoading(false)
  }, [dispatch, navigate, localWallet, setErrorLoading])

  return (
    <ConnectModal
      headerText={'walletProvider.seeker.connect.header'}
      bodyText={'walletProvider.seeker.connect.body'}
      buttonText={'walletProvider.seeker.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
    />
  )
}
