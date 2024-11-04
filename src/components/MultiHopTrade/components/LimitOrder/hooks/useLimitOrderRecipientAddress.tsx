import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'
import type { Address } from 'viem'
import { useManualReceiveAddressIsRequired } from 'components/MultiHopTrade/hooks/useManualReceiveAddressIsRequired'
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
  const [manualReceiveAddressIsValid, setManualReceiveAddressIsValid] = useState<
    boolean | undefined
  >(undefined)
  const [manualReceiveAddressIsEditing, setManualReceiveAddressIsEditing] = useState(false)
  const [manualReceiveAddressIsValidating, setManualReceiveAddressIsValidating] = useState(false)
  const { walletReceiveAddress } = useReceiveAddress({
    buyAccountId,
    buyAsset,
  })

  const onManualReceiveAddressError = useCallback(() => {
    setManualReceiveAddress(undefined)
  }, [])

  const onEditManualReceiveAddress = useCallback(() => {
    setManualReceiveAddressIsEditing(true)
  }, [])

  const onCancelManualReceiveAddress = useCallback(() => {
    setManualReceiveAddressIsEditing(false)
    // Reset form value and valid state on cancel so the valid check doesn't wrongly evaluate to false after bailing out of editing an invalid address
    setManualReceiveAddressIsValid(undefined)
  }, [])

  const onResetManualReceiveAddress = useCallback(() => {
    // Reset the manual receive address in store
    setManualReceiveAddress(undefined)
    // Reset the valid state in store
    setManualReceiveAddressIsValid(undefined)
  }, [])

  const onSubmitManualReceiveAddress = useCallback((address: string) => {
    setManualReceiveAddress(address)
    setManualReceiveAddressIsEditing(false)
  }, [])

  const manualReceiveAddressIsRequired = useManualReceiveAddressIsRequired({
    shouldForceManualAddressEntry: false,
    sellAccountId,
    buyAsset,
    manualReceiveAddress,
    walletReceiveAddress,
  })

  const isRecipientAddressEntryActive = useMemo(() => {
    return (
      manualReceiveAddressIsRequired ||
      manualReceiveAddressIsValidating ||
      manualReceiveAddressIsEditing ||
      manualReceiveAddressIsValid === false
    )
  }, [
    manualReceiveAddressIsEditing,
    manualReceiveAddressIsRequired,
    manualReceiveAddressIsValid,
    manualReceiveAddressIsValidating,
  ])

  const renderedRecipientAddress = useMemo(() => {
    return (
      <SharedRecipientAddress
        buyAsset={buyAsset}
        manualReceiveAddress={manualReceiveAddress}
        walletReceiveAddress={walletReceiveAddress}
        onCancel={onCancelManualReceiveAddress}
        onEdit={onEditManualReceiveAddress}
        onError={onManualReceiveAddressError}
        onIsValidatingChange={setManualReceiveAddressIsValidating}
        onIsValidChange={setManualReceiveAddressIsValid}
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
  ])

  return {
    isRecipientAddressEntryActive,
    renderedRecipientAddress,
    recipientAddress: (manualReceiveAddress ?? walletReceiveAddress) as Address | undefined,
  }
}
