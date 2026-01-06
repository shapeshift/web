import { useMutation } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'
import type { ActionDto } from '@/lib/yieldxyz/types'

type UseEnterYieldParams = {
  yieldId: string
  address: string
  amount: string
  validatorAddress?: string
  receiverAddress?: string
  feeConfigurationId?: string
}

export const useEnterYield = () =>
  useMutation({
    mutationFn: async (params: UseEnterYieldParams): Promise<ActionDto> => {
      const { yieldId, address, amount, validatorAddress, receiverAddress, feeConfigurationId } =
        params
      return yieldxyzApi.enterYield(yieldId, address, {
        amount,
        ...(validatorAddress && { validatorAddress }),
        ...(receiverAddress && { receiverAddress }),
        ...(feeConfigurationId && { feeConfigurationId }),
      })
    },
  })

export type UseEnterYieldReturn = ReturnType<typeof useEnterYield>['mutateAsync']
