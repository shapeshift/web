import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import { getThorchainLendingPosition } from '@/lib/utils/thorchain/lending'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/marketDataSlice/selectors'
import { store } from '@/state/store'

type UseLendingPositionDataProps = {
  accountId: AccountId | null
  assetId: AssetId
}

export const thorchainLendingPositionQueryFn = async ({
  queryKey,
}: {
  queryKey: [string, { accountId: AccountId; assetId: AssetId }]
}) => {
  const [, { accountId, assetId }] = queryKey
  const position = await getThorchainLendingPosition({ accountId, assetId })
  return position
}

export const useLendingPositionData = ({ accountId, assetId }: UseLendingPositionDataProps) => {
  const lendingPositionQueryKey: [string, { accountId: AccountId | null; assetId: AssetId }] =
    useMemo(() => ['thorchainLendingPosition', { accountId, assetId }], [accountId, assetId])

  const lendingPositionData = useQuery({
    // This is on purpose. We want lending position data to be cached forever
    // The only time we need new data is when doing a lending borrow/repayment
    // in which case we programatically invalidate queries
    staleTime: Infinity,
    queryKey: lendingPositionQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { accountId, assetId }] = queryKey
      const position = await getThorchainLendingPosition({ accountId, assetId })
      return position
    },
    select: data => {
      // Get fresh state from store to avoid stale closures in react-query select callbacks
      const state = store.getState()
      const poolAssetMarketData = selectMarketDataByAssetIdUserCurrency(state, assetId)

      // returns actual derived data, or zero's out fields in case there is no active position
      const collateralBalanceCryptoPrecision = fromThorBaseUnit(data?.collateral_current).toString()

      const collateralBalanceFiatUserCurrency = fromThorBaseUnit(data?.collateral_current)
        .times(bnOrZero(poolAssetMarketData?.price))
        .toString()

      const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(state)
      const debtBalanceFiatUserCurrency = fromThorBaseUnit(data?.debt_current)
        .times(bnOrZero(userCurrencyToUsdRate))
        .toString()

      return {
        collateralBalanceCryptoPrecision,
        collateralBalanceFiatUserCurrency,
        debtBalanceFiatUserCurrency,
        address: data?.owner,
      }
    },
    enabled: Boolean(accountId && assetId),
  })

  return lendingPositionData
}
