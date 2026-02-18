import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import { MessageContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/MessageContent'
import {
  SolanaMultiTransactionContent,
  SolanaTransactionContent,
} from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/SolanaTransactionContent'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectSigningModal'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CustomTransactionData,
  SolanaSignAllTransactionsCallRequest,
  SolanaSignAndSendTransactionCallRequest,
  SolanaSignMessageCallRequest,
  SolanaSignTransactionCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import { SolanaSigningMethod } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'

const SolanaContent: FC<{ request: { method: string; params: Record<string, unknown> } }> = ({
  request,
}) => {
  const content = useMemo(() => {
    switch (request.method) {
      case SolanaSigningMethod.SOLANA_SIGN_TRANSACTION:
      case SolanaSigningMethod.SOLANA_SIGN_AND_SEND_TRANSACTION: {
        const transaction = (request.params as { transaction: string }).transaction
        return <SolanaTransactionContent transaction={transaction} />
      }
      case SolanaSigningMethod.SOLANA_SIGN_ALL_TRANSACTIONS: {
        const transactions = (request.params as { transactions: string[] }).transactions
        return <SolanaMultiTransactionContent transactions={transactions} />
      }
      case SolanaSigningMethod.SOLANA_SIGN_MESSAGE: {
        const message = (request.params as { message: string }).message
        return <MessageContent message={message} />
      }
      default:
        return null
    }
  }, [request.method, request.params])

  return content
}

export const SolanaSignMessageConfirmationModal: FC<
  WalletConnectRequestModalProps<
    | SolanaSignTransactionCallRequest
    | SolanaSignAndSendTransactionCallRequest
    | SolanaSignAllTransactionsCallRequest
    | SolanaSignMessageCallRequest
  >
> = ({ onConfirm, onReject, state, topic }) => {
  const { method } = useWalletConnectState(state)
  const request = state.modalData.requestEvent?.params.request

  const handleFormSubmit = useCallback(
    async (formData?: CustomTransactionData) => {
      await onConfirm(formData)
    },
    [onConfirm],
  )

  if (!request || !method) return null

  return (
    <WalletConnectSigningModal
      onConfirm={handleFormSubmit}
      onReject={onReject}
      state={state}
      topic={topic}
    >
      <SolanaContent request={request} />
    </WalletConnectSigningModal>
  )
}
