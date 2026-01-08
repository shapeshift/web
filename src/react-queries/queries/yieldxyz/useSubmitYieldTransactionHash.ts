import { useMutation, useQueryClient } from '@tanstack/react-query'

import { submitTransactionHash } from '@/lib/yieldxyz/api'

export const useSubmitYieldTransactionHash = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      transactionId,
      hash,
    }: {
      transactionId: string
      hash: string
      yieldId?: string
      address?: string
    }) => submitTransactionHash({ transactionId, hash }),
    onSuccess: (_, variables) => {
      if (variables.yieldId && variables.address) {
        queryClient.invalidateQueries({
          queryKey: ['yieldxyz', 'balances', variables.yieldId, variables.address],
        })
      }
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'allBalances'] })
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'yields'] })
    },
  })
}
