import { useMutation, useQueryClient } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'

export const useEnterYield = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { yieldId: string; address: string; arguments: Record<string, unknown> }) =>
      yieldxyzApi.enterYield(data.yieldId, data.address, data.arguments),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'balances', variables.yieldId] })
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'allBalances'] })
    },
  })
}
