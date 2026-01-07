import { useMutation, useQueryClient } from '@tanstack/react-query'

import { submitTransactionHash } from '@/lib/yieldxyz/api'

export const useSubmitYieldTransactionHash = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ transactionId, hash }: { transactionId: string; hash: string }) =>
      submitTransactionHash(transactionId, hash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'balances'] })
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'allBalances'] })
    },
  })
}
