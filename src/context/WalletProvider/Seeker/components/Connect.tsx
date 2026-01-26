import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { WalletActions } from '@/context/WalletProvider/actions'
import { ConnectModal } from '@/context/WalletProvider/components/ConnectModal'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { SeekerConfig } from '@/context/WalletProvider/Seeker/config'
import { SeekerHDWallet } from '@/context/WalletProvider/Seeker/SeekerAdapter'
import {
  checkSeekerAvailability,
  seekerAuthorize,
} from '@/context/WalletProvider/Seeker/seekerMessageHandlers'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile } from '@/lib/globals'

/**
 * Seeker Wallet Connect Component
 *
 * This component handles connection to Solana Mobile's Seeker wallet.
 * It communicates with the mobile app's SeekerWalletManager via postMessage.
 *
 * NOTE: Seeker wallet is only available when running in the ShapeShift mobile app
 * on a Seeker device (or device with MWA-compatible wallet installed).
 */
export const SeekerConnect = () => {
  const navigate = useNavigate()
  const { dispatch } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setLoading(false)
  }, [])

  // Check Seeker availability on mount
  useEffect(() => {
    if (!isMobile) {
      setIsAvailable(false)
      return
    }

    void checkSeekerAvailability()
      .then(result => {
        setIsAvailable(result.available)
        if (!result.available) {
          setError('walletProvider.seeker.errors.notAvailable')
        }
      })
      .catch(() => {
        setIsAvailable(false)
        setError('walletProvider.seeker.errors.checkFailed')
      })
  }, [])

  const pairDevice = useCallback(async () => {
    if (!isMobile) {
      setErrorLoading('walletProvider.seeker.errors.mobileOnly')
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Request authorization from Seeker wallet via mobile app
      const result = await seekerAuthorize('mainnet-beta')

      if (!result.success || !result.address) {
        setErrorLoading(result.error ?? 'walletProvider.seeker.errors.authFailed')
        navigate('/seeker/failure')
        return
      }

      const { name, icon } = SeekerConfig
      const deviceId = `seeker:${result.address}`
      const wallet = new SeekerHDWallet(deviceId, result.address)

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          name,
          icon,
          deviceId,
          connectedType: KeyManager.Seeker,
          meta: {
            address: result.address,
            label: result.label,
          },
        },
      })
      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })
      localWallet.setLocalWallet({ type: KeyManager.Seeker, deviceId })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      console.error('Seeker Connect: There was an error connecting', e)
      setErrorLoading(errorMessage)
      navigate('/seeker/failure')
    }

    setLoading(false)
  }, [dispatch, navigate, localWallet, setErrorLoading])

  // Show different UI based on availability
  const bodyText =
    isAvailable === false
      ? 'walletProvider.seeker.errors.notAvailable'
      : 'walletProvider.seeker.connect.body'

  const buttonDisabled = !isAvailable || loading

  return (
    <ConnectModal
      headerText={'walletProvider.seeker.connect.header'}
      bodyText={bodyText}
      buttonText={'walletProvider.seeker.connect.button'}
      onPairDeviceClick={pairDevice}
      loading={loading}
      error={error}
      isButtonDisabled={buttonDisabled}
    />
  )
}
