import type { ChainId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'

import { thorchainBlockTimeMs } from '../constants'
import type { ThorchainMimir } from '../types'

import { reactQueries } from '@/react-queries'

export const useThorchainMimir = <SelectData = ThorchainMimir,>({
  chainId,
  select,
  enabled = true,
}: {
  chainId: ChainId
  select?: (mimir: ThorchainMimir) => SelectData
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: reactQueries.thornode.mimir(chainId).queryKey,
    queryFn: enabled ? reactQueries.thornode.mimir(chainId).queryFn : skipToken,
    staleTime: thorchainBlockTimeMs,
    select,
  })
}
