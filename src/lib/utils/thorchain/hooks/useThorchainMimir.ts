import type { ChainId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'

import { thorchainBlockTimeMs } from '../constants'
import type { ThorchainMimir } from '../types'

import { getMimirQuery } from '@/react-queries/queries/thornode'

type UseThorchainMimirProps<SelectData = ThorchainMimir> = {
  chainId: ChainId
  select?: (mimir: ThorchainMimir) => SelectData
  enabled?: boolean
}

export const useThorchainMimir = <SelectData = ThorchainMimir>({
  chainId,
  select,
  enabled = true,
}: UseThorchainMimirProps<SelectData>) => {
  const { queryKey, queryFn } = getMimirQuery(chainId)

  return useQuery({
    queryKey,
    queryFn: enabled ? queryFn : skipToken,
    staleTime: thorchainBlockTimeMs,
    select,
  })
}
