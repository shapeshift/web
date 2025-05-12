import { skipToken, useQuery } from '@tanstack/react-query'

import { thorchainBlockTimeMs } from '../constants'
import type { ThorchainMimir } from '../types'

import { reactQueries } from '@/react-queries'
import { fetchThorchainMimir } from '@/react-queries/queries/thornode'

export const useThorchainMimir = <SelectData = ThorchainMimir,>({
  select,
  enabled = true,
}: {
  select?: (mimir: ThorchainMimir) => SelectData
  enabled?: boolean
}) => {
  const { queryKey } = reactQueries.thornode.mimir()

  return useQuery({
    queryKey,
    queryFn: enabled ? fetchThorchainMimir : skipToken,
    staleTime: thorchainBlockTimeMs,
    select,
  })
}
