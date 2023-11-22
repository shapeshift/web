import { type AccountId, type AssetId } from '@shapeshiftoss/caip'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { bn } from 'lib/bignumber/bignumber'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import type { Borrower } from 'lib/utils/thorchain/lending/types'
import {
  selectAccountIdsByAssetId,
  selectUsdRateByAssetId,
  selectUserCurrencyRateByAssetId,
} from 'state/slices/selectors'
import { store } from 'state/store'

import { useLendingSupportedAssets } from './useLendingSupportedAssets'

type UseAllLendingPositionsDataProps = {
  assetId?: AssetId
}

export const useAllLendingPositionsData = ({ assetId }: UseAllLendingPositionsDataProps = {}) => {
  const { data: lendingSupportedAssets } = useLendingSupportedAssets({ type: 'collateral' })

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
    [assetId, lendingSupportedAssets],
  )

  const positions = useQueries({
    queries: accounts.map(({ accountId, assetId: accountAssetId }) => {
      const assetUsdRate = selectUsdRateByAssetId(store.getState(), accountAssetId) ?? '0'
      const assetUserCurrencyRate = selectUserCurrencyRateByAssetId(
        store.getState(),
        accountAssetId,
      )
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

          const collateralBalanceFiatUsd = fromThorBaseUnit(data?.collateral_current)
            .times(assetUsdRate)
            .toString()
          const collateralBalanceFiatUserCurrency = fromThorBaseUnit(data?.collateral_current)
            .times(assetUserCurrencyRate)
            .toString()
          const debtBalanceFiatUSD = fromThorBaseUnit(data?.debt_current).toString()

          return {
            collateralBalanceFiatUsd,
            collateralBalanceCryptoPrecision,
            collateralBalanceFiatUserCurrency,
            debtBalanceFiatUSD,
            address: data?.owner,
            accountId,
            assetId: accountAssetId,
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

  console.log({ collateralValueUsd, debtValueUsd })

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
  const isActive = useMemo(() => positions.some(position => position.data), [positions])

  return {
    debtValueUsd,
    collateralValueUsd,
    collateralValueUserCurrency,
    positions,
    isLoading,
    isActive,
  }
}
