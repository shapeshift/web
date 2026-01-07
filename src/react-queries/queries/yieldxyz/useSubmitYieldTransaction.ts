import { useMutation, useQueryClient } from '@tanstack/react-query'

import { submitTransaction } from '@/lib/yieldxyz/api'

export const useSubmitYieldTransaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      transactionId,
      signedTransaction,
    }: {
      transactionId: string
      signedTransaction: string
    }) => submitTransaction(transactionId, signedTransaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'balances'] })
    },
  })
}
