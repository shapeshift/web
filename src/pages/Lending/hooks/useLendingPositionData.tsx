import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { getThorchainLendingPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { useAppSelector } from 'state/store'

type UseLendingPositionDataProps = {
  accountId: AccountId
  assetId: AssetId
}

export const useLendingPositionData = ({ accountId, assetId }: UseLendingPositionDataProps) => {
  const lendingPositionQueryKey: [string, { accountId: AccountId; assetId: AssetId }] = useMemo(
    () => ['thorchainLendingPosition', { accountId, assetId }],
    [accountId, assetId],
  )
  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const lendingPositionData = useQuery({
    // The time before the data is considered stale, meaning firing this query after it elapses will trigger queryFn
    staleTime: 60_000,
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
      const debtBalanceFiatUSD = fromThorBaseUnit(data?.debt_current).toString()

      return {
        collateralBalanceCryptoPrecision,
        collateralBalanceFiatUserCurrency,
        debtBalanceFiatUSD,
        address: data?.owner,
      }
    },
    enabled: Boolean(accountId && assetId && poolAssetMarketData.price !== '0'),
    refetchOnMount: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  })

  return lendingPositionData
}
