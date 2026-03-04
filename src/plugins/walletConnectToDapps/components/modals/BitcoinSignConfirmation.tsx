import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import { BitcoinPsbtContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/BitcoinPsbtContent'
import { BitcoinSendTransferContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/BitcoinSendTransferContent'
import { MessageContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/MessageContent'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectSigningModal'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  BIP122SendTransferCallRequest,
  BIP122SendTransferCallRequestParams,
  BIP122SignMessageCallRequest,
  BIP122SignMessageCallRequestParams,
  BIP122SignPsbtCallRequest,
  BIP122SignPsbtCallRequestParams,
  CustomTransactionData,
} from '@/plugins/walletConnectToDapps/types'
import { BIP122SigningMethod } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'

const BitcoinContent: FC<{ request: { method: string; params: Record<string, unknown> } }> = ({
  request,
}) => {
  const content = useMemo(() => {
    switch (request.method) {
      case BIP122SigningMethod.BIP122_SIGN_MESSAGE: {
        const { message } = request.params as unknown as BIP122SignMessageCallRequestParams
        return <MessageContent message={message} />
      }
      case BIP122SigningMethod.BIP122_SEND_TRANSFER: {
        const { recipientAddress, amount, memo } =
          request.params as unknown as BIP122SendTransferCallRequestParams
        return (
          <BitcoinSendTransferContent
            recipientAddress={recipientAddress}
            amount={amount}
            memo={memo}
          />
        )
      }
      case BIP122SigningMethod.BIP122_SIGN_PSBT: {
        const { psbt, broadcast } = request.params as unknown as BIP122SignPsbtCallRequestParams
        return <BitcoinPsbtContent psbt={psbt} broadcast={broadcast} />
      }
      default:
        return null
    }
  }, [request.method, request.params])

  return content
}

export const BitcoinSignConfirmationModal: FC<
  WalletConnectRequestModalProps<
    BIP122SendTransferCallRequest | BIP122SignPsbtCallRequest | BIP122SignMessageCallRequest
  >
> = ({ onConfirm, onReject, state, topic }) => {
  const { method } = useWalletConnectState(state)
  const request = state.modalData.requestEvent?.params.request

  const handleFormSubmit = useCallback(
    (formData?: CustomTransactionData) => onConfirm(formData),
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
      <BitcoinContent request={request} />
    </WalletConnectSigningModal>
  )
}
