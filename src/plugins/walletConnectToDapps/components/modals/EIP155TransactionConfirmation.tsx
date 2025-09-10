import { Center } from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { WalletConnectSigningModal } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal'
import { TransactionContent } from '@/plugins/walletConnectToDapps/components/content/TransactionContent'
import { useCallRequestEvmFees } from '@/plugins/walletConnectToDapps/hooks/useCallRequestEvmFees'
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
  const { transaction, isInteractingWithContract, chainId } = useWalletConnectState(state)
  const { isLoading, feeAsset, fees } = useCallRequestEvmFees(state)
  const { showErrorToast } = useErrorToast()

  const form = useForm<CustomTransactionData>({
    defaultValues: {
      nonce: transaction?.nonce ? convertHexToNumber(transaction.nonce).toString() : undefined,
      gasLimit: transaction?.gasLimit ?? transaction?.gas ? convertHexToNumber(transaction.gasLimit ?? transaction.gas!).toString() : undefined,
      speed: FeeDataKey.Fast,
      customFee: {
        baseFee: '0',
        priorityFee: '0',
      },
    },
  })

  const handleFormSubmit = useCallback(async () => {
    await handleConfirm()
  }, [handleConfirm])

  if (isLoading || isInteractingWithContract === null) {
    return (
      <Center p={8}>
        <CircularProgress />
      </Center>
    )
  }

  // if the transaction is missing the dapp sent invalid params
  if (!transaction) {
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
        gasSelection={fees && feeAsset ? { fees, feeAsset, formMethods: form } : undefined}
      >
        <TransactionContent
          transaction={transaction}
          chainId={chainId ?? ''}
          isInteractingWithContract={isInteractingWithContract}
          feeAsset={feeAsset ? { symbol: feeAsset.symbol, precision: feeAsset.precision, icon: feeAsset.icon ?? '' } : undefined}
        />
      </WalletConnectSigningModal>
    </FormProvider>
  )
}