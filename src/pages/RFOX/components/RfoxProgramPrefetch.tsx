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

// Warms the queries keyed on a staking program, for the programs the user has not selected
// Without it, the first switch to another program leaves the whole view loading at once
// Rendered once per program rather than looped inside a hook, so each gets its own set of hooks
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
