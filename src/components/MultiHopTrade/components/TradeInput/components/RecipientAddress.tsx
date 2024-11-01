import { useCallback } from 'react'
import { selectInputBuyAsset } from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { SharedRecipientAddress } from '../../SharedTradeInput/SharedRecipientAddress'
import { useTradeReceiveAddress } from '../hooks/useTradeReceiveAddress'

type RecipientAddressProps = {
  shouldForceManualAddressEntry?: boolean
  recipientAddressDescription?: string
  manualAddressEntryDescription?: string
}

export const RecipientAddress = ({
  shouldForceManualAddressEntry,
  recipientAddressDescription,
  manualAddressEntryDescription,
}: RecipientAddressProps) => {
  const dispatch = useAppDispatch()

  const { manualReceiveAddress, walletReceiveAddress } = useTradeReceiveAddress()
  const buyAsset = useAppSelector(selectInputBuyAsset)

  const onIsValidatingChange = useCallback(
    (isValidating: boolean) => {
      dispatch(tradeInput.actions.setManualReceiveAddressIsValidating(isValidating))
    },
    [dispatch],
  )

  const onIsValidChange = useCallback(
    (isValid: boolean) => {
      dispatch(tradeInput.actions.setManualReceiveAddressIsValid(isValid))
    },
    [dispatch],
  )

  const onError = useCallback(() => {
    dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
  }, [dispatch])

  const onEdit = useCallback(() => {
    dispatch(tradeInput.actions.setManualReceiveAddressIsEditing(true))
  }, [dispatch])

  const onCancel = useCallback(() => {
    dispatch(tradeInput.actions.setManualReceiveAddressIsEditing(false))
    // Reset form value and valid state on cancel so the valid check doesn't wrongly evaluate to false after bailing out of editing an invalid address
    dispatch(tradeInput.actions.setManualReceiveAddressIsValid(undefined))
  }, [dispatch])

  const onReset = useCallback(() => {
    // Reset the manual receive address in store
    dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
    // Reset the valid state in store
    dispatch(tradeInput.actions.setManualReceiveAddressIsValid(undefined))
  }, [dispatch])

  const onSubmit = useCallback(
    (address: string) => {
      dispatch(tradeInput.actions.setManualReceiveAddress(address))
      dispatch(tradeInput.actions.setManualReceiveAddressIsEditing(false))
    },
    [dispatch],
  )

  return (
    <SharedRecipientAddress
      buyAsset={buyAsset}
      customRecipientAddressDescription={recipientAddressDescription}
      manualAddressEntryDescription={manualAddressEntryDescription}
      manualReceiveAddress={manualReceiveAddress}
      shouldForceManualAddressEntry={shouldForceManualAddressEntry}
      walletReceiveAddress={walletReceiveAddress}
      onCancel={onCancel}
      onEdit={onEdit}
      onError={onError}
      onIsValidatingChange={onIsValidatingChange}
      onIsValidChange={onIsValidChange}
      onReset={onReset}
      onSubmit={onSubmit}
    />
  )
}
