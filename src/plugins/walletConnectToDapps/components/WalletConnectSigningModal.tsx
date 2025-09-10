import { VStack } from '@chakra-ui/react'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import type { FC, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { WalletConnectPeerHeader } from '@/plugins/walletConnectToDapps/components/modals/WalletConnectPeerHeader'
import { WalletConnectSigningFooter } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningFooter'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CustomTransactionData,
  WalletConnectState,
} from '@/plugins/walletConnectToDapps/types'

type WalletConnectSigningModalProps = {
  // Core modal props
  onConfirm: (customTransactionData?: CustomTransactionData) => Promise<void>
  onReject: () => Promise<void>
  state: WalletConnectState
  topic: string

  // Content - just children, keep it simple
  children: ReactNode

  // Optional gas selection (only for transactions)
  gasSelection?: {
    fees: Record<FeeDataKey, { txFee?: string; fiatFee: string }>
    feeAsset: Asset
    formMethods: UseFormReturn<CustomTransactionData>
  }
}

export const WalletConnectSigningModal: FC<WalletConnectSigningModalProps> = ({
  onConfirm,
  onReject,
  state,
  topic,
  children,
  gasSelection,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { address, chainId } = useWalletConnectState(state)
  const peerMetadata = state.sessionsByTopic[topic]?.peer.metadata

  const handleConfirm = useCallback(
    async (customTransactionData?: CustomTransactionData) => {
      setIsSubmitting(true)
      try {
        await onConfirm(customTransactionData)
      } finally {
        setIsSubmitting(false)
      }
    },
    [onConfirm],
  )

  const handleReject = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await onReject()
    } finally {
      setIsSubmitting(false)
    }
  }, [onReject])

  return (
    <VStack spacing={0} align='stretch'>
      <WalletConnectPeerHeader peerMetadata={peerMetadata} />

      {/* Dynamic content area */}
      {children}

      <WalletConnectSigningFooter
        address={address ?? null}
        chainId={chainId ?? null}
        gasSelection={gasSelection}
        onConfirm={handleConfirm}
        onReject={handleReject}
        isSubmitting={isSubmitting}
      />
    </VStack>
  )
}
