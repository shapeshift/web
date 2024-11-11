import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { useIsManualReceiveAddressRequired } from 'components/MultiHopTrade/hooks/useIsManualReceiveAddressRequired'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { limitOrderInput } from 'state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectManualReceiveAddress,
  selectManualReceiveAddressIsEditing,
  selectManualReceiveAddressIsValid,
  selectManualReceiveAddressIsValidating,
} from 'state/slices/limitOrderInputSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { SharedRecipientAddress } from '../../SharedTradeInput/SharedRecipientAddress'

type UseLimitOrderRecipientAddressProps = {
  buyAsset: Asset
  buyAccountId: string | undefined
  sellAccountId: string | undefined
}

export const useLimitOrderRecipientAddress = ({
  buyAsset,
  buyAccountId,
  sellAccountId,
}: UseLimitOrderRecipientAddressProps) => {
  const dispatch = useAppDispatch()

  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)
  const isManualReceiveAddressValid = useAppSelector(selectManualReceiveAddressIsValid)
  const isManualReceiveAddressEditing = useAppSelector(selectManualReceiveAddressIsEditing)
  const isManualReceiveAddressValidating = useAppSelector(selectManualReceiveAddressIsValidating)

  const { walletReceiveAddress, isLoading: isWalletReceiveAddressLoading } = useReceiveAddress({
    sellAccountId,
    buyAccountId,
    buyAsset,
  })

  const handleManualReceiveAddressError = useCallback(() => {
    dispatch(limitOrderInput.actions.setManualReceiveAddress(undefined))
  }, [dispatch])

  const handleEditManualReceiveAddress = useCallback(() => {
    dispatch(limitOrderInput.actions.setManualReceiveAddressIsEditing(true))
  }, [dispatch])

  const handleCancelManualReceiveAddress = useCallback(() => {
    dispatch(limitOrderInput.actions.setManualReceiveAddressIsEditing(false))
    // Reset form value and valid state on cancel so the valid check doesn't wrongly evaluate to false after bailing out of editing an invalid address
    dispatch(limitOrderInput.actions.setManualReceiveAddressIsValid(undefined))
  }, [dispatch])

  const handleResetManualReceiveAddress = useCallback(() => {
    // Reset the manual receive address in store
    dispatch(limitOrderInput.actions.setManualReceiveAddress(undefined))
    // Reset the valid state in store
    dispatch(limitOrderInput.actions.setManualReceiveAddressIsValid(undefined))
  }, [dispatch])

  const handleSubmitManualReceiveAddress = useCallback(
    (address: string) => {
      dispatch(limitOrderInput.actions.setManualReceiveAddress(address))
      dispatch(limitOrderInput.actions.setManualReceiveAddressIsEditing(false))
    },
    [dispatch],
  )

  const handleIsManualReceiveAddressValidatingChange = useCallback(
    (isValidating: boolean) => {
      dispatch(limitOrderInput.actions.setManualReceiveAddressIsValidating(isValidating))
    },
    [dispatch],
  )

  const handleIsManualReceiveAddressValidChange = useCallback(
    (isValid: boolean) => {
      dispatch(limitOrderInput.actions.setManualReceiveAddressIsValid(isValid))
    },
    [dispatch],
  )

  const isManualReceiveAddressRequired = useIsManualReceiveAddressRequired({
    shouldForceManualAddressEntry: false,
    sellAccountId,
    buyAsset,
    manualReceiveAddress,
    walletReceiveAddress,
    isWalletReceiveAddressLoading,
  })

  const isRecipientAddressEntryActive = useMemo(() => {
    return (
      isManualReceiveAddressRequired ||
      isManualReceiveAddressValidating ||
      isManualReceiveAddressEditing ||
      isManualReceiveAddressValid === false
    )
  }, [
    isManualReceiveAddressEditing,
    isManualReceiveAddressRequired,
    isManualReceiveAddressValid,
    isManualReceiveAddressValidating,
  ])

  const renderedRecipientAddress = useMemo(() => {
    return (
      <SharedRecipientAddress
        buyAsset={buyAsset}
        isWalletReceiveAddressLoading={isWalletReceiveAddressLoading}
        manualReceiveAddress={manualReceiveAddress}
        walletReceiveAddress={walletReceiveAddress}
        onCancel={handleCancelManualReceiveAddress}
        onEdit={handleEditManualReceiveAddress}
        onError={handleManualReceiveAddressError}
        onIsValidatingChange={handleIsManualReceiveAddressValidatingChange}
        onIsValidChange={handleIsManualReceiveAddressValidChange}
        onReset={handleResetManualReceiveAddress}
        onSubmit={handleSubmitManualReceiveAddress}
      />
    )
  }, [
    buyAsset,
    isWalletReceiveAddressLoading,
    manualReceiveAddress,
    walletReceiveAddress,
    handleCancelManualReceiveAddress,
    handleEditManualReceiveAddress,
    handleManualReceiveAddressError,
    handleIsManualReceiveAddressValidatingChange,
    handleIsManualReceiveAddressValidChange,
    handleResetManualReceiveAddress,
    handleSubmitManualReceiveAddress,
  ])

  return {
    isRecipientAddressEntryActive,
    renderedRecipientAddress,
    recipientAddress: (manualReceiveAddress ?? walletReceiveAddress) as Address | undefined,
  }
}
