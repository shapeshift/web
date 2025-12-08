import { useCallback } from 'react'

import { SharedTradeReceiveAddress } from '../../SharedTradeInput/SharedTradeReceiveAddress'
import { useTradeReceiveAddress } from '../hooks/useTradeReceiveAddress'

import { selectInputBuyAsset } from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type ReceiveAddressProps = {
  shouldForceManualAddressEntry?: boolean
  receiveAddressDescription?: string
  manualAddressEntryDescription?: string
}

export const ReceiveAddress = ({
  shouldForceManualAddressEntry,
  receiveAddressDescription,
  manualAddressEntryDescription,
}: ReceiveAddressProps) => {
  const dispatch = useAppDispatch()

  const {
    manualReceiveAddress,
    walletReceiveAddress,
    isLoading: isWalletReceiveAddressLoading,
  } = useTradeReceiveAddress()

  const buyAsset = useAppSelector(selectInputBuyAsset)

  const handleIsValidatingChange = useCallback(
    (isValidating: boolean) => {
      dispatch(tradeInput.actions.setIsManualReceiveAddressValidating(isValidating))
    },
    [dispatch],
  )

  const handleIsValidChange = useCallback(
    (isValid: boolean) => {
      dispatch(tradeInput.actions.setIsManualReceiveAddressValid(isValid))
    },
    [dispatch],
  )

  const handleError = useCallback(() => {
    dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
  }, [dispatch])

  const handleEdit = useCallback(() => {
    dispatch(tradeInput.actions.setIsManualReceiveAddressEditing(true))
  }, [dispatch])

  const handleCancel = useCallback(() => {
    dispatch(tradeInput.actions.setIsManualReceiveAddressEditing(false))
    // Reset form value and valid state on cancel so the valid check doesn't wrongly evaluate to false after bailing out of editing an invalid address
    dispatch(tradeInput.actions.setIsManualReceiveAddressValid(undefined))
  }, [dispatch])

  const handleReset = useCallback(() => {
    // Reset the manual receive address in store
    dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
    // Reset the valid state in store
    dispatch(tradeInput.actions.setIsManualReceiveAddressValid(undefined))
  }, [dispatch])

  const handleSubmit = useCallback(
    (address: string) => {
      dispatch(tradeInput.actions.setManualReceiveAddress(address))
      dispatch(tradeInput.actions.setIsManualReceiveAddressEditing(false))
    },
    [dispatch],
  )

  return (
    <SharedTradeReceiveAddress
      buyAsset={buyAsset}
      customReceiveAddressDescription={receiveAddressDescription}
      isWalletReceiveAddressLoading={isWalletReceiveAddressLoading}
      manualAddressEntryDescription={manualAddressEntryDescription}
      manualReceiveAddress={manualReceiveAddress}
      shouldForceManualAddressEntry={shouldForceManualAddressEntry}
      walletReceiveAddress={walletReceiveAddress}
      onCancel={handleCancel}
      onEdit={handleEdit}
      onError={handleError}
      onIsValidatingChange={handleIsValidatingChange}
      onIsValidChange={handleIsValidChange}
      onReset={handleReset}
      onSubmit={handleSubmit}
    />
  )
}
