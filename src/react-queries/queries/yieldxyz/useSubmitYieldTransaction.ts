import { useMutation } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'

type UseSubmitYieldTransactionParams = {
  transactionId: string
  signedTransaction: string
}

export const useSubmitYieldTransaction = () =>
  useMutation({
    mutationFn: async (params: UseSubmitYieldTransactionParams): Promise<void> => {
      const { transactionId, signedTransaction } = params
      return yieldxyzApi.submitTransaction(transactionId, signedTransaction)
    },
  })

export type UseSubmitYieldTransactionReturn = ReturnType<
  typeof useSubmitYieldTransaction
>['mutateAsync']
