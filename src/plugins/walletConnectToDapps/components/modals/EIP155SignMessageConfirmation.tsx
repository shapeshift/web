import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { MessageContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/MessageContent'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectSigningModal'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CustomTransactionData,
  EthPersonalSignCallRequest,
  EthSignCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'

export const EIP155SignMessageConfirmationModal: FC<
  WalletConnectRequestModalProps<EthSignCallRequest | EthPersonalSignCallRequest>
> = ({ onConfirm, onReject, state, topic }) => {
  const { message } = useWalletConnectState(state)

  // Create form for consistency with transaction signing, even though message signing doesn't need form fields
  const form = useForm<CustomTransactionData>({
    defaultValues: {
      speed: FeeDataKey.Fast,
    },
  })

  const handleFormSubmit = useCallback(
    async (formData?: CustomTransactionData) => {
      await onConfirm(formData)
    },
    [onConfirm],
  )

  if (!message) return null

  return (
    <FormProvider {...form}>
      <WalletConnectSigningModal
        onConfirm={handleFormSubmit}
        onReject={onReject}
        state={state}
        topic={topic}
      >
        <MessageContent message={message} />
      </WalletConnectSigningModal>
    </FormProvider>
  )
}
