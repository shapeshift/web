import { Button } from '@chakra-ui/react'
import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import { LedgerReadOnlyBody } from '../components/LedgerReadOnlyBody'
import { PairBody } from '../components/PairBody'

import { LedgerIcon } from '@/components/Icons/LedgerIcon'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { LEDGER_DEVICE_ID } from '@/context/WalletProvider/Ledger/constants'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useLedgerConnectionState } from '@/hooks/useLedgerConnectionState'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { portfolio, portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectPortfolioHasWalletId } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

// Icon and name const *not* imported from config, as this will throw if we try and import too early from there
const Icon = LedgerIcon
const icon = <Icon boxSize='64px' />
const name = 'Ledger'

export const LedgerRoutes = () => {
  const {
    state: { modalType },
    dispatch: walletDispatch,
    getAdapter,
  } = useWallet()
  const localWallet = useLocalWallet()
  const dispatch = useAppDispatch()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceCountError, setDeviceCountError] = useState<string | null>(null)
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')
  const isLedgerAccountManagementEnabled = useFeatureFlag('AccountManagementLedger')
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')

  const {
    connectionState,
    isDisconnected: isUSBDisconnected,
    isConnectionAttempting,
    handleAutoConnect,
  } = useLedgerConnectionState()

  const isPreviousLedgerDeviceDetected = useAppSelector(state =>
    selectPortfolioHasWalletId(state, LEDGER_DEVICE_ID),
  )

  const handleCheckNumDevices = useCallback(async () => {
    const devices = await TransportWebUSB.list().catch(e => {
      console.error(e)
      return []
    })
    return devices.length
  }, [])

  const handleClearPortfolio = useCallback(() => {
    dispatch(portfolio.actions.clear())
    dispatch(portfolioApi.util.resetApiState())
  }, [dispatch])

  const handlePair = useCallback(async () => {
    setError(null)
    setDeviceCountError(null)
    setIsLoading(true)

    const adapter = await getAdapter(KeyManager.Ledger)
    if (adapter) {
      try {
        // Pair the device, which gets approval from the browser to communicate with the Ledger USB device
        const wallet = await adapter.pairDevice()

        // Check the number of connected devices
        const numDevices = await handleCheckNumDevices()

        // Ensure exactly one device is connected
        switch (true) {
          case numDevices < 1:
            setDeviceCountError('walletProvider.ledger.errors.noDeviceConnected')
            setIsLoading(false)
            return
          case numDevices > 1:
            setDeviceCountError('walletProvider.ledger.errors.multipleDevicesConnected')
            setIsLoading(false)
            return
          default:
            setDeviceCountError(null)
        }

        if (!wallet) {
          setError('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-ledger::pairDevice returned null or undefined')
        }

        const deviceId = await wallet.getDeviceID()

        walletDispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon: Icon, deviceId, connectedType: KeyManager.Ledger },
        })
        walletDispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })
        localWallet.setLocalWallet({ type: KeyManager.Ledger, deviceId })

        // If account management is enabled, exit the WalletProvider context
        if (isAccountManagementEnabled && isLedgerAccountManagementEnabled) {
          walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        } else {
          walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'walletProvider.ledger.errors.unknown')
      }
    }
    setIsLoading(false)
  }, [
    getAdapter,
    handleCheckNumDevices,
    isAccountManagementEnabled,
    isLedgerAccountManagementEnabled,
    localWallet,
    walletDispatch,
  ])

  const handleClearCacheAndPair = useCallback(async () => {
    handleClearPortfolio()
    await handlePair()
  }, [handleClearPortfolio, handlePair])

  useEffect(() => {
    if (!modalType || !isLedgerReadOnlyEnabled) return

    // NOTE: auto-connect here only refers to attempting a usb conn for the purpose of maybe going to the fallback read-only screen,
    // not actually pairing the device.
    // Only auto-connect for users who:
    // 1. Have connected a Ledger before (portfolio data exists)
    // 2. AND have a Ledger physically connected (for the sake of simplicity, we assume USB perms granted, if not, welcome to bugs hell)
    // This ensures first-time users get develop behavior exactly
    const shouldAttemptAutoConnect = isPreviousLedgerDeviceDetected && !isUSBDisconnected

    if (!shouldAttemptAutoConnect) return

    handleAutoConnect()
  }, [
    modalType,
    isLedgerReadOnlyEnabled,
    isPreviousLedgerDeviceDetected,
    isUSBDisconnected,
    handleAutoConnect,
  ])

  const secondaryButton = useMemo(
    () =>
      !isLoading && isPreviousLedgerDeviceDetected ? (
        <Button
          onClick={handleClearCacheAndPair}
          maxW='200px'
          width='100%'
          colorScheme='blue'
          variant='outline'
          isDisabled={isLoading || Boolean(deviceCountError)}
        >
          <Text translation='walletProvider.ledger.connect.pairNewDeviceButton' />
        </Button>
      ) : null,
    [deviceCountError, handleClearCacheAndPair, isLoading, isPreviousLedgerDeviceDetected],
  )

  const ledgerPairElement = useMemo(() => {
    // Only show loading for explicit user actions, not auto-connect attempts
    const combinedLoading = isLoading

    if (
      isLedgerReadOnlyEnabled &&
      (connectionState === 'failed' || isUSBDisconnected) &&
      isPreviousLedgerDeviceDetected
    ) {
      return <LedgerReadOnlyBody />
    }
    return (
      <PairBody
        icon={icon}
        headerTranslation='walletProvider.ledger.connect.header'
        bodyTranslation={
          isPreviousLedgerDeviceDetected
            ? 'walletProvider.ledger.connect.pairExistingDeviceBody'
            : 'walletProvider.ledger.connect.pairNewDeviceBody'
        }
        buttonTranslation={
          isPreviousLedgerDeviceDetected
            ? 'walletProvider.ledger.connect.pairExistingDeviceButton'
            : 'walletProvider.ledger.connect.pairNewDeviceButton'
        }
        isLoading={combinedLoading}
        error={error ?? deviceCountError}
        onPairDeviceClick={handlePair}
        secondaryContent={secondaryButton}
      />
    )
  }, [
    isLedgerReadOnlyEnabled,
    connectionState,
    isUSBDisconnected,
    deviceCountError,
    error,
    handlePair,
    isLoading,
    isPreviousLedgerDeviceDetected,
    secondaryButton,
  ])

  if (!modalType) return null

  return (
    <Routes>
      <Route path='/ledger/connect' element={ledgerPairElement} />
    </Routes>
  )
}
