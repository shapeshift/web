import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useCooldownPeriodQuery } from '../hooks/useCooldownPeriodQuery'
import { useCurrentApyQuery } from '../hooks/useCurrentApyQuery'
import { getEarnedQueryFn, getEarnedQueryKey } from '../hooks/useEarnedQuery'
import { useRfoxPauseStateQuery } from '../hooks/useRfoxPauseStateQuery'
import { useTimeInPoolQuery } from '../hooks/useTimeInPoolQuery'

import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from '@/state/store'

type RfoxProgramPrefetchProps = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
}

/**
 * Warms every query keyed on a staking program, for programs the user has not selected. Almost
 * everything in the rFOX view is keyed on the selected program, so without this the first switch
 * to another program leaves the whole view loading at once while it all refetches.
 *
 * Rendered once per program rather than looped over inside a hook, so each program gets its own
 * set of hooks. Query keys match the ones the real consumers use, so this only ever results in one
 * request per key.
 */
export const RfoxProgramPrefetch: React.FC<RfoxProgramPrefetchProps> = ({
  stakingAssetId,
  stakingAssetAccountId,
}) => {
  const dispatch = useAppDispatch()

  // Also warms total staked and the staking asset's price history, which it reads
  useCurrentApyQuery({ stakingAssetId })
  useRfoxPauseStateQuery(stakingAssetId)
  useCooldownPeriodQuery(stakingAssetId)
  useTimeInPoolQuery({ stakingAssetId, stakingAssetAccountId })

  // Feeds the current epoch rewards, whose other inputs are not program specific
  useQuery({
    queryKey: getEarnedQueryKey({ stakingAssetAccountId, stakingAssetId }),
    queryFn: getEarnedQueryFn({ stakingAssetAccountId, stakingAssetId }),
    staleTime: 60 * 1000, // 1 minute in milliseconds
  })

  useEffect(() => {
    dispatch(marketApi.endpoints.findByAssetId.initiate(stakingAssetId))
  }, [dispatch, stakingAssetId])

  return null
}
