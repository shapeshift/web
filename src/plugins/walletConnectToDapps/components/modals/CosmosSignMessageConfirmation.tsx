import type { FC } from 'react'
import { useCallback } from 'react'

import { CosmosSignAminoContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/CosmosSignAminoContent'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectSigningModal'
import type { CosmosSignAminoCallRequest } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'

export const CosmosSignMessageConfirmationModal: FC<
  WalletConnectRequestModalProps<CosmosSignAminoCallRequest>
> = ({ onConfirm, onReject, state, topic }) => {
  const request = state.modalData.requestEvent?.params.request

  const handleFormSubmit = useCallback(async () => {
    await onConfirm()
  }, [onConfirm])

  if (!request) return null

  return (
    <WalletConnectSigningModal
      onConfirm={handleFormSubmit}
      onReject={onReject}
      state={state}
      topic={topic}
    >
      <CosmosSignAminoContent signDoc={request.params.signDoc} />
    </WalletConnectSigningModal>
  )
}
