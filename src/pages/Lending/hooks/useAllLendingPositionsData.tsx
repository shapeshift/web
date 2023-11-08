import { type AccountId, type AssetId } from '@shapeshiftoss/caip'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { bn } from 'lib/bignumber/bignumber'
import type { Borrower } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/types'
import { getThorchainLendingPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { fromThorBaseUnit } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { selectAccountIdsByAssetId, selectUsdRateByAssetId } from 'state/slices/selectors'
import { store } from 'state/store'

import { useLendingSupportedAssets } from './useLendingSupportedAssets'

export const useAllLendingPositionsData = () => {
  const { data: lendingSupportedAssets } = useLendingSupportedAssets()

  const accounts = useMemo(
    () =>
      (lendingSupportedAssets ?? [])
        .map(asset => {
          const assetId = asset.assetId
          const _accountIds = selectAccountIdsByAssetId(store.getState(), { assetId })
          return _accountIds.map(accountId => ({ accountId, assetId }))
        })
        .flat(),
    [lendingSupportedAssets],
  )

  const positions = useQueries({
    queries: accounts.map(({ accountId, assetId }) => {
      const usdRate = selectUsdRateByAssetId(store.getState(), assetId)
      const lendingPositionQueryKey: [string, { accountId: AccountId; assetId: AssetId }] = [
        'thorchainLendingPosition',
        { accountId, assetId },
      ]

      return {
        staleTime: 120_000,
        queryKey: lendingPositionQueryKey,
        queryFn: async () => {
          const position = await getThorchainLendingPosition({ accountId, assetId })
          return position
        },
        select: (data: Borrower | null) => {
          // returns actual derived data, or zero's out fields in case there is no active position
          const collateralBalanceCryptoPrecision = fromThorBaseUnit(
            data?.collateral_current,
          ).toString()

          const collateralBalanceFiatUsd = fromThorBaseUnit(data?.collateral_current).times(
            usdRate ?? 0,
          )
          const debtBalanceFiatUSD = fromThorBaseUnit(data?.debt_current).toString()

          return {
            collateralBalanceFiatUsd: collateralBalanceFiatUsd.toString(),
            collateralBalanceCryptoPrecision,
            debtBalanceFiatUSD,
            address: data?.owner,
          }
        },
      }
    }),
  })

  const debtValueUsd = useMemo(
    () =>
      positions
        .reduce((acc, position) => {
          if (position.data?.debtBalanceFiatUSD) {
            return acc.plus(position.data.debtBalanceFiatUSD)
          }
          return acc
        }, bn(0))
        .toString(),
    [positions],
  )

  const collateralValueUsd = useMemo(
    () =>
      positions
        .reduce((acc, position) => {
          if (position.data?.collateralBalanceFiatUsd) {
            return acc.plus(position.data.collateralBalanceFiatUsd)
          }
          return acc
        }, bn(0))
        .toString(),
    [positions],
  )

  const isLoading = useMemo(() => positions.some(position => position.isLoading), [positions])

  return {
    debtValueUsd,
    collateralValueUsd,
    isLoading,
  }
}
