import type { FC } from 'react'

import { EIP712MessageDisplay } from '@/plugins/walletConnectToDapps/components/modals/EIP712MessageDisplay'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectSigningModal'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type { EthSignTypedDataCallRequest } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'

export const EIP155SignTypedDataConfirmation: FC<
  WalletConnectRequestModalProps<EthSignTypedDataCallRequest>
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
      <EIP712MessageDisplay message={message} />
    </WalletConnectSigningModal>
  )
}
