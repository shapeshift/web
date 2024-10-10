import { Button } from '@chakra-ui/react'
import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import React, { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectPortfolioHasWalletId } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { ConnectModal } from '../../components/ConnectModal'
import { LedgerConfig } from '../config'
import { LEDGER_DEVICE_ID } from '../constants'

export interface LedgerSetupProps
  extends RouteComponentProps<
    {},
    any // history
  > {
  dispatch: React.Dispatch<ActionTypes>
}

export const LedgerConnect = ({ history }: LedgerSetupProps) => {
  const { dispatch: walletDispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceCountError, setDeviceCountError] = useState<string | null>(null)
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')
  const isLedgerAccountManagementEnabled = useFeatureFlag('AccountManagementLedger')

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setIsLoading(false)
  }, [])

  // TEMP: This is a temporary solution to check if a Ledger device is cached. We can hardcode the
  // device ID as it's the same for all Ledger devices.
  // See https://github.com/shapeshift/web/issues/6814
  const isPreviousLedgerDeviceDetected = useAppSelector(state =>
    selectPortfolioHasWalletId(state, LEDGER_DEVICE_ID),
  )

  const handleCheckNumDevices = useCallback(async () => {
    const devices = await TransportWebUSB.list().catch(e => {
      console.error(e)
      return []
    })
    const numDevices = devices.length
    return numDevices
  }, [])

  const handlePair = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    const adapter = await getAdapter(KeyManager.Ledger)
    if (adapter) {
      try {
        // Pair the device, which gets approval from the browser to communicate with the Ledger USB device
        const wallet = await adapter.pairDevice()

        // Check the number of connected devices. Needs a device to be paired for this to work (see above)
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
          setErrorLoading('walletProvider.errors.walletNotFound')
          throw new Error('Call to hdwallet-ledger::pairDevice returned null or undefined')
        }

        const { name, icon } = LedgerConfig
        // NOTE: All Ledger devices get the same device ID, i.e '0001', but we fetch it from the
        // device anyway
        const deviceId = await wallet.getDeviceID()

        walletDispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Ledger },
        })
        walletDispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })
        localWallet.setLocalWallet({ type: KeyManager.Ledger, deviceId })

        // If account management is enabled, exit the WalletProvider context, which doesn't have access to the ModalProvider
        // The Account drawer will be opened further down the tree
        if (isAccountManagementEnabled && isLedgerAccountManagementEnabled) {
          walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        } else {
          history.push('/ledger/chains')
        }
      } catch (e: any) {
        console.error(e)
        setErrorLoading(e?.message || 'walletProvider.ledger.errors.unknown')
      }
    }

    // Don't set isLoading to false to prevent UI glitching during pairing.
    // Loading state will be reset when the component is remounted
    // setIsLoading(false)
  }, [
    getAdapter,
    handleCheckNumDevices,
    history,
    isAccountManagementEnabled,
    isLedgerAccountManagementEnabled,
    localWallet,
    setErrorLoading,
    walletDispatch,
  ])

  const handleClearPortfolio = useCallback(() => {
    dispatch(portfolio.actions.clear())
    dispatch(portfolioApi.util.resetApiState())
  }, [dispatch])

  const handleClearCacheAndPair = useCallback(async () => {
    handleClearPortfolio()
    await handlePair()
  }, [handleClearPortfolio, handlePair])

  return (
    <ConnectModal
      headerText={'walletProvider.ledger.connect.header'}
      bodyText={
        isPreviousLedgerDeviceDetected
          ? 'walletProvider.ledger.connect.pairExistingDeviceBody'
          : 'walletProvider.ledger.connect.pairNewDeviceBody'
      }
      buttonText={
        isPreviousLedgerDeviceDetected
          ? 'walletProvider.ledger.connect.pairExistingDeviceButton'
          : 'walletProvider.ledger.connect.pairNewDeviceButton'
      }
      onPairDeviceClick={handlePair}
      loading={isLoading}
      isButtonDisabled={isLoading}
      error={error ?? deviceCountError}
    >
      {/* Hide the whole button while loading to prevent UI glitching during pairing */}
      {!isLoading && isPreviousLedgerDeviceDetected && (
        <Button
          onClick={handleClearCacheAndPair}
          mt={2}
          width='full'
          colorScheme='blue'
          variant='outline'
          isDisabled={isLoading || Boolean(deviceCountError)}
        >
          {translate('walletProvider.ledger.connect.pairNewDeviceButton')}
        </Button>
      )}
    </ConnectModal>
  )
}
