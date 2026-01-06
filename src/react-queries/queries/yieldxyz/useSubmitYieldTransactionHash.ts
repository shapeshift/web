import { useMutation, useQueryClient } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'

export const useSubmitYieldTransactionHash = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ transactionId, hash }: { transactionId: string; hash: string }) =>
      yieldxyzApi.submitTransactionHash(transactionId, hash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'balances'] })
    },
  })
}
