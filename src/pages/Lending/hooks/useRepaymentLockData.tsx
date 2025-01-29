import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { THORCHAIN_BLOCK_TIME_SECONDS, thorchainBlockTimeMs } from 'lib/utils/thorchain/constants'

import { thorchainLendingPositionQueryFn } from './useLendingPositionData'

type UseLendingPositionDataProps = {
  accountId?: AccountId | null
  assetId?: AssetId
  enabled?: boolean
}

export const useRepaymentLockData = ({
  accountId,
  assetId,
  // Let the parent pass its own query options
  // enabled will be used in conjunction with this hook's own isRepaymentLockQueryEnabled to determine whether or not to run the query
  enabled = true,
}: UseLendingPositionDataProps) => {
  const { data: blockHeight } = useQuery({
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // We use the block query to get the current height, so we obviously need to mark it stale at the end of each THOR block
    staleTime: thorchainBlockTimeMs,
    ...reactQueries.thornode.block(),
    select: block => block.header.height,
    enabled,
  })

  const lendingPositionQueryKey = useMemo(
    () => ['thorchainLendingPosition', { accountId, assetId }],
    [accountId, assetId],
  )

  const { data: position, isSuccess: isPositionQuerySuccess } = useQuery({
    // TODO(gomes): we may or may not want to change this, but this avoids spamming the API for the time being.
    // by default, there's a 5mn cache time, but a 0 stale time, meaning queries are considered stale immediately
    // Since react-query queries aren't persisted, and until we have an actual need for ensuring the data is fresh,
    // this is a good way to avoid spamming the API during develpment
    staleTime: Infinity,
    queryFn: thorchainLendingPositionQueryFn,
    // accountId and assetId are actually enabled at runtime - see enabled below
    queryKey: lendingPositionQueryKey as [string, { accountId: AccountId; assetId: AssetId }],
    enabled: enabled && !!accountId && !!assetId,
  })

  const repaymentLockData = useQuery({
    ...reactQueries.thornode.mimir(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // We use the mimir query to get the repayment maturity block, so need to mark it stale at the end of each THOR block
    staleTime: thorchainBlockTimeMs,
    select: mimirData => {
      if (!mimirData || !blockHeight) return null

      const repaymentMaturity = mimirData.LOANREPAYMENTMATURITY as number

      // If position is not available, return the repayment maturity as specified by the network, currently about 30 days
      if (!position) {
        return bnOrZero(repaymentMaturity)
          .times(THORCHAIN_BLOCK_TIME_SECONDS)
          .div(60 * 60 * 24)
          .toString()
      }

      // We have a user position, so we can calculate the actual repayment lock
      const repaymentBlock = bnOrZero(position.last_open_height).plus(repaymentMaturity)
      return bnOrZero(repaymentBlock)
        .minus(blockHeight)
        .times(THORCHAIN_BLOCK_TIME_SECONDS)
        .div(60 * 60 * 24)
        .toFixed(1)
    },
    enabled: isPositionQuerySuccess,
  })

  return repaymentLockData
}
