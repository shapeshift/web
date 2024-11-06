import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'
import type { Address } from 'viem'
import { useIsManualReceiveAddressRequired } from 'components/MultiHopTrade/hooks/useIsManualReceiveAddressRequired'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'

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
  const [manualReceiveAddress, setManualReceiveAddress] = useState<string | undefined>(undefined)
  const [isManualReceiveAddressValid, setIsManualReceiveAddressValid] = useState<
    boolean | undefined
  >(undefined)
  const [isManualReceiveAddressEditing, setIsManualReceiveAddressEditing] = useState(false)
  const [isManualReceiveAddressValidating, setIsManualReceiveAddressValidating] = useState(false)
  const { walletReceiveAddress, isLoading: isWalletReceiveAddressLoading } = useReceiveAddress({
    buyAccountId,
    buyAsset,
  })

  const onManualReceiveAddressError = useCallback(() => {
    setManualReceiveAddress(undefined)
  }, [])

  const onEditManualReceiveAddress = useCallback(() => {
    setIsManualReceiveAddressEditing(true)
  }, [])

  const onCancelManualReceiveAddress = useCallback(() => {
    setIsManualReceiveAddressEditing(false)
    // Reset form value and valid state on cancel so the valid check doesn't wrongly evaluate to false after bailing out of editing an invalid address
    setIsManualReceiveAddressValid(undefined)
  }, [])

  const onResetManualReceiveAddress = useCallback(() => {
    // Reset the manual receive address in store
    setManualReceiveAddress(undefined)
    // Reset the valid state in store
    setIsManualReceiveAddressValid(undefined)
  }, [])

  const onSubmitManualReceiveAddress = useCallback((address: string) => {
    setManualReceiveAddress(address)
    setIsManualReceiveAddressEditing(false)
  }, [])

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
        onCancel={onCancelManualReceiveAddress}
        onEdit={onEditManualReceiveAddress}
        onError={onManualReceiveAddressError}
        onIsValidatingChange={setIsManualReceiveAddressValidating}
        onIsValidChange={setIsManualReceiveAddressValid}
        onReset={onResetManualReceiveAddress}
        onSubmit={onSubmitManualReceiveAddress}
      />
    )
  }, [
    buyAsset,
    manualReceiveAddress,
    onCancelManualReceiveAddress,
    onEditManualReceiveAddress,
    onManualReceiveAddressError,
    onResetManualReceiveAddress,
    onSubmitManualReceiveAddress,
    walletReceiveAddress,
    isWalletReceiveAddressLoading,
  ])

  return {
    isRecipientAddressEntryActive,
    renderedRecipientAddress,
    recipientAddress: (manualReceiveAddress ?? walletReceiveAddress) as Address | undefined,
  }
}
