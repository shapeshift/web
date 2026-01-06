import { useMutation } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'
import type { ActionDto } from '@/lib/yieldxyz/types'

type UseExitYieldParams = {
  yieldId: string
  address: string
  amount?: string
  useMaxAmount?: boolean
}

export const useExitYield = () =>
  useMutation({
    mutationFn: async (params: UseExitYieldParams): Promise<ActionDto> => {
      const { yieldId, address, amount, useMaxAmount } = params
      return yieldxyzApi.exitYield(yieldId, address, {
        ...(amount !== undefined && { amount }),
        ...(useMaxAmount !== undefined && { useMaxAmount }),
      })
    },
  })

export type UseExitYieldReturn = ReturnType<typeof useExitYield>['mutateAsync']
