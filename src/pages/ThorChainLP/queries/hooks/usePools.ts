import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { reactQueries } from 'react-queries'
import { bn } from 'lib/bignumber/bignumber'
import type { MidgardPoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { selectAssets, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { Pool } from './usePool'
import { getPool } from './usePool'

export type { Pool } from './usePool'

export const usePools = () => {
  const assets = useAppSelector(selectAssets)
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const selectPools = useCallback(
    (midgardPools: MidgardPoolResponse[]) => {
      if (!midgardPools?.length) return []

      return midgardPools
        .reduce<Pool[]>((acc, midgardPool) => {
          const pool = getPool(midgardPool, assets, runeMarketData.price)
          if (!pool) return acc
          acc.push(pool)
          return acc
        }, [])
        .sort((a, b) => bn(b.runeDepth).comparedTo(a.runeDepth))
    },
    [assets, runeMarketData],
  )

  const pools = useQuery({
    ...reactQueries.midgard.poolsData(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // 5 minutes, since this is related to pools data, not user data - we can afford to have this stale for longer
    staleTime: 60_000 * 5,
    select: selectPools,
  })

  return pools
}
