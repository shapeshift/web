import { Image, VStack } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import type { FC, ReactNode } from 'react'
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
  transaction?: TransactionParams
  formContext?: UseFormReturn<CustomTransactionData>
}

export const WalletConnectSigningModal: FC<WalletConnectSigningModalProps> = ({
  onConfirm,
  onReject,
  state,
  topic,
  children,
  transaction,
  formContext,
}) => {
  const { accountId } = useWalletConnectState(state)
  const peerMetadata = state.sessionsByTopic[topic]?.peer.metadata

  const { mutate: handleConfirm, isPending: isConfirmPending } = useMutation({
    mutationFn: onConfirm,
  })

  const { mutate: handleReject, isPending: isRejectPending } = useMutation({
    mutationFn: onReject,
  })

  if (!accountId) return null

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
        accountId={accountId}
        transaction={transaction}
        onConfirm={handleConfirm}
        onReject={handleReject}
        isSubmitting={isConfirmPending || isRejectPending}
        formContext={formContext}
      />
    </VStack>
  )
}
