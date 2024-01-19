import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { QueryObserverOptions } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { thorchainLendingPositionQueryFn } from './useLendingPositionData'

type UseLendingPositionDataProps = {
  accountId?: AccountId
  assetId?: AssetId
}

// Current blocktime as per https://thorchain.network/stats
const thorchainBlockTimeSeconds = '6.1'

export const useRepaymentLockData = ({
  accountId,
  assetId,
  // Let the parent pass its own query options
  // enabled will be used in conjunction with this hook's own isRepaymentLockQueryEnabled to determine whether or not to run the query
  enabled = true,
}: UseLendingPositionDataProps & QueryObserverOptions) => {
  const { data: blockHeight } = useQuery({
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
    enabled,
    select: mimir => {
      if (!mimir) return null

      const repaymentMaturity =
        'LOANREPAYMENTMATURITY' in mimir ? (mimir.LOANREPAYMENTMATURITY as number) : null

      // If we have position and blockHeight, calculate repaymentLock
      if (
        accountId &&
        assetId &&
        position &&
        isPositionQuerySuccess &&
        blockHeight &&
        repaymentMaturity
      ) {
        const { last_open_height } = position
        const repaymentBlock = bnOrZero(last_open_height).plus(repaymentMaturity)
        const repaymentLock = bnOrZero(repaymentBlock)
          .minus(blockHeight)
          .times(thorchainBlockTimeSeconds)
          .div(60 * 60 * 24)
          .toFixed(1)

        return {
          ...mimir,
          repaymentMaturity,
          repaymentLock,
        }
      }

      // Return mimir data with repayment maturity if available
      return {
        ...mimir,
        repaymentMaturity,
      }
    },
  })

  return repaymentLockData
}
