import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useLendingSupportedAssets } from './useLendingSupportedAssets'

import { bn } from '@/lib/bignumber/bignumber'
import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import { getThorchainLendingPosition } from '@/lib/utils/thorchain/lending'
import type { Borrower } from '@/lib/utils/thorchain/lending/types'
import {
  selectAccountIdsByAssetId,
  selectEnabledWalletAccountIds,
  selectUserCurrencyRateByAssetId,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

type UseAllLendingPositionsDataProps = {
  assetId?: AssetId
}

export const useAllLendingPositionsData = ({ assetId }: UseAllLendingPositionsDataProps = {}) => {
  const { data: lendingSupportedAssets } = useLendingSupportedAssets({
    type: 'collateral',
  })

  const accountIds = useAppSelector(selectEnabledWalletAccountIds)
  const accounts = useMemo(
    () =>
      (lendingSupportedAssets ?? [])
        .map(asset => {
          if (assetId && assetId !== asset.assetId) return []
          const _accountIds = selectAccountIdsByAssetId(store.getState(), {
            assetId: asset.assetId,
          })
          return _accountIds.map(accountId => ({ accountId, assetId: asset.assetId }))
        })
        .flat(),
    // We want to react on accountIds, since the portfolio may not be loaded in the useMemo() above,
    // and we're iterating, meaning we cannot be reactive on selectAccountIdsByAssetId at hook scope
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assetId, accountIds, lendingSupportedAssets],
  )

  const positions = useQueries({
    queries: accounts.map(({ accountId, assetId: accountAssetId }) => {
      const assetUserCurrencyRate = selectUserCurrencyRateByAssetId(
        store.getState(),
        accountAssetId,
      )
      const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(store.getState())
      const lendingPositionQueryKey: [string, { accountId: AccountId; assetId: AssetId }] = [
        'thorchainLendingPosition',
        { accountId, assetId: accountAssetId },
      ]

      return {
        staleTime: 120_000,
        queryKey: lendingPositionQueryKey,
        queryFn: async () => {
          const position = await getThorchainLendingPosition({ accountId, assetId: accountAssetId })
          return position
        },
        select: (data: Borrower | null) => {
          if (!data) return

          const collateralBalanceCryptoPrecision = fromThorBaseUnit(
            data?.collateral_current,
          ).toString()

          const collateralBalanceFiatUserCurrency = fromThorBaseUnit(data?.collateral_current)
            .times(assetUserCurrencyRate)
            .toString()
          const debtBalanceFiatUserCurrency = fromThorBaseUnit(data?.debt_current)
            .times(userCurrencyToUsdRate)
            .toString()

          return {
            collateralBalanceCryptoPrecision,
            collateralBalanceFiatUserCurrency,
            debtBalanceFiatUserCurrency,
            address: data?.owner,
            accountId,
            assetId: accountAssetId,
          }
        },
      }
    }),
  })

  const debtValueUserCurrency = useMemo(
    () =>
      positions
        .reduce((acc, position) => {
          if (position.data?.debtBalanceFiatUserCurrency) {
            return acc.plus(position.data.debtBalanceFiatUserCurrency)
          }
          return acc
        }, bn(0))
        .toString(),
    [positions],
  )

  const collateralValueUserCurrency = useMemo(
    () =>
      positions
        .reduce((acc, position) => {
          if (position.data?.collateralBalanceFiatUserCurrency) {
            return acc.plus(position.data.collateralBalanceFiatUserCurrency)
          }
          return acc
        }, bn(0))
        .toString(),
    [positions],
  )

  const isLoading = useMemo(() => positions.some(position => position.isLoading), [positions])

  const isActive = useMemo(() => {
    return positions.some(position => {
      const data = position.data
      if (!data) return false
      const { collateralBalanceCryptoPrecision } = data
      return collateralBalanceCryptoPrecision && parseFloat(collateralBalanceCryptoPrecision) > 0
    })
  }, [positions])

  return {
    debtValueUserCurrency,
    collateralValueUserCurrency,
    positions,
    isLoading,
    isActive,
  }
}
