import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { thorchainLendingPositionQueryFn } from './useLendingPositionData'

type UseLendingPositionDataProps = {
  accountId?: AccountId
  assetId?: AssetId
}

// non-exhaustive, we only use this to get the current blockheight
type ThorchainBlock = {
  header: {
    height: number
  }
}

// Current blocktime as per https://thorchain.network/stats
const thorchainBlockTimeSeconds = '6.1'
const thorchainBlockTimeMs = bn(thorchainBlockTimeSeconds).times(1000).toNumber()

export const useRepaymentLockData = ({ accountId, assetId }: UseLendingPositionDataProps) => {
  const repaymentLockQueryKey = useMemo(
    () => ['thorchainLendingRepaymentLock', { accountId, assetId }],
    [accountId, assetId],
  )

  const { data: blockHeight } = useQuery({
    // Mark blockHeight query as stale at the end of each THOR block
    staleTime: thorchainBlockTimeMs,
    queryKey: ['thorchainBlockHeight'],
    queryFn: async () => {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const { data: block } = await axios.get<ThorchainBlock>(`${daemonUrl}/lcd/thorchain/block`)
      const blockHeight = block.header.height
      return blockHeight
    },
    enabled: true,
  })

  const { data: mimir } = useQuery({
    // We use the mimir query to get the repayment maturity block, so need to mark it stale at the end of each THOR block
    staleTime: thorchainBlockTimeMs,
    queryKey: ['thorchainMimir'],
    queryFn: async () => {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const { data: mimir } = await axios.get<Record<string, unknown>>(
        `${daemonUrl}/lcd/thorchain/mimir`,
      )
      return mimir
    },
    enabled: true,
  })

  const lendingPositionQueryKey = useMemo(
    () => ['thorchainLendingPosition', { accountId, assetId }],
    [accountId, assetId],
  )

  const { data: position } = useQuery({
    // TODO(gomes): we may or may not want to change this, but this avoids spamming the API for the time being.
    // by default, there's a 5mn cache time, but a 0 stale time, meaning queries are considered stale immediately
    // Since react-query queries aren't persisted, and until we have an actual need for ensuring the data is fresh,
    // this is a good way to avoid spamming the API during develpment
    staleTime: Infinity,
    queryFn: thorchainLendingPositionQueryFn,
    // accountId and assetId are actually enabled at runtime - see enabled below
    queryKey: lendingPositionQueryKey as [string, { accountId: AccountId; assetId: AssetId }],
    enabled: !!accountId && !!assetId,
  })

  const repaymentLockData = useQuery({
    staleTime: Infinity,
    queryKey: repaymentLockQueryKey,
    queryFn: () => {
      if (mimir && 'LOANREPAYMENTMATURITY' in mimir)
        return {
          repaymentMaturity: mimir.LOANREPAYMENTMATURITY as number,
          position,
          blockHeight,
        }
      return null
    },
    select: data => {
      if (!(data && data?.blockHeight)) return null
      const { repaymentMaturity, position, blockHeight } = data

      // No position, return the repayment maturity as specified by the network, i.e not for the specific position
      if (!position)
        return bnOrZero(repaymentMaturity)
          .times(thorchainBlockTimeSeconds)
          .div(60 * 60 * 24)
          .toString()

      const { last_open_height } = position

      const repaymentBlock = bnOrZero(last_open_height).plus(repaymentMaturity)

      const repaymentLock = bnOrZero(repaymentBlock)
        .minus(blockHeight)
        .times(thorchainBlockTimeSeconds)
        .div(60 * 60 * 24)
        .toFixed(1)

      return repaymentLock
    },
    enabled: true,
  })

  return repaymentLockData
}
