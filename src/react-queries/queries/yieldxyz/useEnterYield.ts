import { useMutation, useQueryClient } from '@tanstack/react-query'

import { enterYield } from '@/lib/yieldxyz/api'

export const useEnterYield = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { yieldId: string; address: string; arguments: Record<string, unknown> }) =>
      enterYield(data.yieldId, data.address, data.arguments),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['yieldxyz', 'balances', variables.yieldId, variables.address],
      })
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'allBalances'] })
    },
  })
}
