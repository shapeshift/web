import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { useIsManualReceiveAddressRequired } from 'components/MultiHopTrade/hooks/useIsManualReceiveAddressRequired'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useActions } from 'hooks/useActions'
import { limitOrderInput } from 'state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectIsManualReceiveAddressEditing,
  selectIsManualReceiveAddressValid,
  selectIsManualReceiveAddressValidating,
  selectManualReceiveAddress,
} from 'state/slices/limitOrderInputSlice/selectors'
import { useAppSelector } from 'state/store'

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
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)
  const isManualReceiveAddressValid = useAppSelector(selectIsManualReceiveAddressValid)
  const isManualReceiveAddressEditing = useAppSelector(selectIsManualReceiveAddressEditing)
  const isManualReceiveAddressValidating = useAppSelector(selectIsManualReceiveAddressValidating)

  const { walletReceiveAddress, isLoading: isWalletReceiveAddressLoading } = useReceiveAddress({
    sellAccountId,
    buyAccountId,
    buyAsset,
  })

  const {
    setManualReceiveAddress,
    setIsManualReceiveAddressEditing,
    setIsManualReceiveAddressValid,
    setIsManualReceiveAddressValidating,
  } = useActions(limitOrderInput.actions)

  const handleManualReceiveAddressError = useCallback(() => {
    setManualReceiveAddress(undefined)
  }, [setManualReceiveAddress])

  const handleEditManualReceiveAddress = useCallback(() => {
    setIsManualReceiveAddressEditing(true)
  }, [setIsManualReceiveAddressEditing])

  const handleCancelManualReceiveAddress = useCallback(() => {
    setIsManualReceiveAddressEditing(false)
    // Reset form value and valid state on cancel so the valid check doesn't wrongly evaluate to false after bailing out of editing an invalid address
    setIsManualReceiveAddressValid(undefined)
  }, [setIsManualReceiveAddressEditing, setIsManualReceiveAddressValid])

  const handleResetManualReceiveAddress = useCallback(() => {
    // Reset the manual receive address in store
    setManualReceiveAddress(undefined)
    // Reset the valid state in store
    setIsManualReceiveAddressValid(undefined)
  }, [setIsManualReceiveAddressValid, setManualReceiveAddress])

  const handleSubmitManualReceiveAddress = useCallback(
    (address: string) => {
      setManualReceiveAddress(address)
      setIsManualReceiveAddressEditing(false)
    },
    [setIsManualReceiveAddressEditing, setManualReceiveAddress],
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
        onIsValidatingChange={setIsManualReceiveAddressValidating}
        onIsValidChange={setIsManualReceiveAddressValid}
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
    setIsManualReceiveAddressValidating,
    setIsManualReceiveAddressValid,
    handleResetManualReceiveAddress,
    handleSubmitManualReceiveAddress,
  ])

  return {
    isRecipientAddressEntryActive,
    renderedRecipientAddress,
    recipientAddress: (manualReceiveAddress ?? walletReceiveAddress) as Address | undefined,
  }
}
