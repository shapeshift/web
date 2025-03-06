import { useQuery } from '@tanstack/react-query'

import { thorchainBlockTimeMs } from '../constants'
import { selectLiquidityLockupTime, selectRunePoolMaturityTime } from '../selectors'

import { reactQueries } from '@/react-queries'

export const useThorchainMimirTimes = () => {
  return useQuery({
    ...reactQueries.thornode.mimir(),
    staleTime: thorchainBlockTimeMs,
    select: mimir => ({
      liquidityLockupTime: selectLiquidityLockupTime(mimir),
      runePoolDepositMaturityTime: selectRunePoolMaturityTime(mimir),
    }),
  })
}
