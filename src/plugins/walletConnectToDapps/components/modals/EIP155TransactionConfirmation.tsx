import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { TransactionAdvancedParameters } from '@/plugins/walletConnectToDapps/components/modals/TransactionAdvancedParameters'
import { TransactionContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/TransactionContent'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectSigningModal'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CustomTransactionData,
  EthSendTransactionCallRequest,
  EthSignTransactionCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import { convertHexToNumber } from '@/plugins/walletConnectToDapps/utils'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'

export const EIP155TransactionConfirmation: FC<
  WalletConnectRequestModalProps<EthSendTransactionCallRequest | EthSignTransactionCallRequest>
> = ({ onConfirm: handleConfirm, onReject: handleReject, state, topic }) => {
  const { transaction, chainId } = useWalletConnectState(state)
  const { showErrorToast } = useErrorToast()

  const form = useForm<CustomTransactionData>({
    defaultValues: {
      nonce: transaction?.nonce ? convertHexToNumber(transaction.nonce).toString() : undefined,
      gasLimit: (() => {
        // i.e input or actual (used) gas
        const gasValue = transaction?.gasLimit ?? transaction?.gas
        return gasValue ? convertHexToNumber(gasValue).toString() : undefined
      })(),
      speed: FeeDataKey.Fast,
      customFee: {
        baseFee: '0',
        priorityFee: '0',
      },
    },
  })

  const handleFormSubmit = useCallback(
    async (formData?: CustomTransactionData) => {
      await handleConfirm(formData)
    },
    [handleConfirm],
  )

  // if the transaction is missing the dapp sent invalid params
  if (!transaction || !chainId) {
    showErrorToast({
      message: 'unable to handle tx due to invalid params',
      params: state.modalData.requestEvent?.params,
    })
    handleReject()
    return null
  }

  return (
    <FormProvider {...form}>
      <WalletConnectSigningModal
        onConfirm={handleFormSubmit}
        onReject={handleReject}
        state={state}
        topic={topic}
        transaction={transaction}
      >
        <TransactionContent transaction={transaction} chainId={chainId} />
        <TransactionAdvancedParameters />
      </WalletConnectSigningModal>
    </FormProvider>
  )
}
