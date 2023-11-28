import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import {
  selectMarketDataById,
  selectUserCurrencyToUsdRate,
} from 'state/slices/marketDataSlice/selectors'
import { store, useAppSelector } from 'state/store'

type UseLendingPositionDataProps = {
  accountId: AccountId
  assetId: AssetId
  skip?: boolean
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

export const useLendingPositionData = ({
  accountId,
  assetId,
  skip,
}: UseLendingPositionDataProps) => {
  const lendingPositionQueryKey: [string, { accountId: AccountId; assetId: AssetId }] = useMemo(
    () => ['thorchainLendingPosition', { accountId, assetId }],
    [accountId, assetId],
  )
  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const lendingPositionData = useQuery({
    // The time before the data is considered stale, meaning firing this query after it elapses will trigger queryFn
    staleTime: 300_000,
    queryKey: lendingPositionQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { accountId, assetId }] = queryKey
      const position = await getThorchainLendingPosition({ accountId, assetId })
      return position
    },
    select: data => {
      // returns actual derived data, or zero's out fields in case there is no active position
      const collateralBalanceCryptoPrecision = fromThorBaseUnit(data?.collateral_current).toString()

      const collateralBalanceFiatUserCurrency = fromThorBaseUnit(data?.collateral_current)
        .times(poolAssetMarketData.price)
        .toString()

      const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(store.getState())
      const debtBalanceFiatUserCurrency = fromThorBaseUnit(data?.debt_current)
        .times(userCurrencyToUsdRate)
        .toString()

      return {
        collateralBalanceCryptoPrecision,
        collateralBalanceFiatUserCurrency,
        debtBalanceFiatUserCurrency,
        address: data?.owner,
      }
    },
    enabled: Boolean(!skip && accountId && assetId && poolAssetMarketData.price !== '0'),
    refetchOnMount: true,
    refetchInterval: 300_000,
    refetchIntervalInBackground: true,
  })

  return lendingPositionData
}
