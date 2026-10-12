import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { TransactionAdvancedParameters } from '@/plugins/walletConnectToDapps/components/modals/TransactionAdvancedParameters'
import { SendTransactionContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/SendTransactionContent'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectSigningModal'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CustomTransactionData,
  EthSendTransactionCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import { toNumberString } from '@/plugins/walletConnectToDapps/utils'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'

export const SendTransactionConfirmation: FC<
  WalletConnectRequestModalProps<EthSendTransactionCallRequest>
> = ({ onConfirm: handleConfirm, onReject: handleReject, state, topic }) => {
  const { transaction, chainId, accountId } = useWalletConnectState(state)
  const { showErrorToast } = useErrorToast()

  const form = useForm<CustomTransactionData>({
    defaultValues: {
      gasLimit: toNumberString(transaction?.gasLimit ?? transaction?.gas),
      speed: FeeDataKey.Fast,
    },
  })

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
        onConfirm={handleConfirm}
        onReject={handleReject}
        state={state}
        topic={topic}
        transaction={transaction}
        formContext={form}
      >
        <SendTransactionContent transaction={transaction} chainId={chainId} />
        <TransactionAdvancedParameters
          accountId={accountId}
          chainId={chainId}
          transaction={transaction}
        />
      </WalletConnectSigningModal>
    </FormProvider>
  )
}
