import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getThorchainLendingPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'

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

export const useRepaymentLockData = ({ accountId, assetId }: UseLendingPositionDataProps) => {
  const repaymentLockQueryKey = useMemo(
    () => ['thorchainLendingRepaymentLock', { accountId, assetId }],
    [accountId, assetId],
  )

  const repaymentLockData = useQuery({
    staleTime: Infinity,
    queryKey: repaymentLockQueryKey,
    queryFn: async () => {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL

      const positionPromise = (async () => {
        if (!(accountId && assetId)) return null
        const position = await getThorchainLendingPosition({ accountId, assetId })
        return position
      })()

      const blockHeightPromise = (async () => {
        const { data: block } = await axios.get<ThorchainBlock>(`${daemonUrl}/lcd/thorchain/block`)
        const blockHeight = block.header.height
        return blockHeight
      })()

      const mimirPromise = axios.get<Record<string, unknown>>(`${daemonUrl}/lcd/thorchain/mimir`)

      const [position, blockHeight, { data: mimir }] = await Promise.all([
        positionPromise,
        blockHeightPromise,
        mimirPromise,
      ])
      if ('LOANREPAYMENTMATURITY' in mimir)
        return {
          repaymentMaturity: mimir.LOANREPAYMENTMATURITY as number,
          position,
          blockHeight,
        }
      return null
    },
    select: data => {
      if (!data) return null
      const { repaymentMaturity, position, blockHeight } = data
      // Current blocktime as per https://thorchain.network/stats
      const thorchainBlockTimeSeconds = '6.1'

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
