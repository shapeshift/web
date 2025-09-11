import { Image, VStack } from '@chakra-ui/react'
import type { FC, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { WalletConnectModalSigningFooter } from './WalletConnectModalSigningFooter'

import { RawText } from '@/components/Text'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CustomTransactionData,
  TransactionParams,
  WalletConnectState,
} from '@/plugins/walletConnectToDapps/types'

type WalletConnectSigningModalProps = {
  onConfirm: (customTransactionData?: CustomTransactionData) => Promise<void>
  onReject: () => Promise<void>
  state: WalletConnectState
  topic: string
  children: ReactNode
  transaction: TransactionParams
  formMethods: UseFormReturn<CustomTransactionData>
}

export const WalletConnectSigningModal: FC<WalletConnectSigningModalProps> = ({
  onConfirm,
  onReject,
  state,
  topic,
  children,
  transaction,
  formMethods,
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
      {peerMetadata && (
        <VStack spacing={4} align='center' py={6}>
          <Image borderRadius='full' boxSize='48px' src={peerMetadata.icons?.[0]} />
          <RawText fontWeight='semibold' fontSize='lg'>
            {peerMetadata.name}
          </RawText>
        </VStack>
      )}

      {children}

      <WalletConnectModalSigningFooter
        address={address ?? null}
        chainId={chainId ?? null}
        transaction={transaction}
        formMethods={formMethods}
        onConfirm={handleConfirm}
        onReject={handleReject}
        isSubmitting={isSubmitting}
      />
    </VStack>
  )
}
