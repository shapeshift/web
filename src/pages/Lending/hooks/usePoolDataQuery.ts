import type { AssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { getAllThorchainLendingPositions, getThorchainPoolInfo } from 'lib/utils/thorchain/lending'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectUserCurrencyToUsdRate,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

export const usePoolDataQuery = ({ poolAssetId }: { poolAssetId: string }) => {
  const poolDataQueryKey: [string, { assetId: AssetId }] = useMemo(
    () => ['thorchainLendingPoolData', { assetId: poolAssetId }],
    [poolAssetId],
  )

  const poolAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, poolAssetId),
  )

  const { isTradingActive } = useIsTradingActive({
    assetId: poolAssetId,
    swapperName: SwapperName.Thorchain,
  })

  const poolDataQuery = useQuery({
    // TODO(gomes): we may or may not want to change this, but this avoids spamming the API for the time being.
    // by default, there's a 5mn cache time, but a 0 stale time, meaning queries are considered stale immediately
    // Since react-query queries aren't persisted, and until we have an actual need for ensuring the data is fresh,
    // this is a good way to avoid spamming the API during develpment
    staleTime: Infinity,
    queryKey: poolDataQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { assetId }] = queryKey
      const positions = await getAllThorchainLendingPositions(assetId)
      const poolInfo = await getThorchainPoolInfo(assetId)
      return { positions, poolInfo }
    },
    select: data => {
      const { positions, poolInfo } = data
      // returns actual derived data, or zero's out fields in case there is no active position
      const totalBorrowers = positions?.length ?? 0

      const { totalCollateral, totalDebt } = positions.reduce(
        (acc, position) => {
          acc.totalCollateral = acc.totalCollateral.plus(position.collateral_current)
          acc.totalDebt = acc.totalDebt.plus(position.debt_current)

          return acc
        },
        {
          totalCollateral: bn(0),
          totalDebt: bn(0),
        },
      )

      const totalCollateralCryptoPrecision = fromThorBaseUnit(totalCollateral).toString()
      const totalDebtUSD = fromThorBaseUnit(totalDebt).toString()
      const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(store.getState())
      const totalDebtUserCurrency = bnOrZero(totalDebtUSD).times(userCurrencyToUsdRate).toString()

      const collateralizationRatioPercent = bnOrZero(poolInfo.loan_cr).div(100)
      const collateralizationRatioPercentDecimal = bnOrZero(collateralizationRatioPercent)
        .div(100)
        .toString()

      const tvlCryptoPrecision = fromThorBaseUnit(poolInfo.loan_collateral)
      const maxSupplyCryptoPrecision = fromThorBaseUnit(poolInfo.loan_collateral).plus(
        fromThorBaseUnit(poolInfo.loan_collateral_remaining),
      )

      const tvl = tvlCryptoPrecision.times(poolAssetMarketData.price).toFixed()
      const maxSupplyFiat = maxSupplyCryptoPrecision.times(poolAssetMarketData.price).toFixed()

      return {
        totalBorrowers,
        totalCollateralCryptoPrecision,
        totalDebtUserCurrency,
        collateralizationRatioPercentDecimal,
        tvl,
        maxSupplyFiat,
        isTradingActive,
        isHardCapReached: bnOrZero(tvl).eq(maxSupplyFiat),
        currentCapFillPercentage: bnOrZero(tvl).div(bnOrZero(maxSupplyFiat)).times(100).toNumber(),
      }
    },
    enabled: true,
  })

  return poolDataQuery
}
