import type { FC } from 'react'

import { MessageContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/MessageContent'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectSigningModal'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  EthPersonalSignCallRequest,
  EthSignCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'

export const EIP155SignMessageConfirmationModal: FC<
  WalletConnectRequestModalProps<EthSignCallRequest | EthPersonalSignCallRequest>
> = ({ onConfirm, onReject, state, topic }) => {
  const { message } = useWalletConnectState(state)

  if (!message) return null

  return (
    <WalletConnectSigningModal
      onConfirm={onConfirm}
      onReject={onReject}
      state={state}
      topic={topic}
    >
      <MessageContent message={message} />
    </WalletConnectSigningModal>
  )
}
