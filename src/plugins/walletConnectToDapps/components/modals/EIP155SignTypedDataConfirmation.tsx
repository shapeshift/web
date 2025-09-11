import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { EIP712MessageDisplay } from '@/plugins/walletConnectToDapps/components/modals/EIP712MessageDisplay'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectSigningModal'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CustomTransactionData,
  EthSignTypedDataCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'

export const EIP155SignTypedDataConfirmation: FC<
  WalletConnectRequestModalProps<EthSignTypedDataCallRequest>
> = ({ onConfirm, onReject, state, topic }) => {
  const { message, chainId } = useWalletConnectState(state)

  // Create form for consistency with transaction signing, even though message signing doesn't need form fields
  const form = useForm<CustomTransactionData>({
    defaultValues: {
      speed: FeeDataKey.Fast,
      customFee: {
        baseFee: '0',
        priorityFee: '0',
      },
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
        <EIP712MessageDisplay message={message} chainId={chainId} />
      </WalletConnectSigningModal>
    </FormProvider>
  )
}
