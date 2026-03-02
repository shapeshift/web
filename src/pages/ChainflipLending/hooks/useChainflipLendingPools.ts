import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET } from '@/lib/chainflip/constants'
import type { ChainflipAssetSymbol, ChainflipLendingPool } from '@/lib/chainflip/types'
import { baseUnitToPrecision, hexToBaseUnit, permillToDecimal } from '@/lib/chainflip/utils'
import { reactQueries } from '@/react-queries'
import type { ReduxState } from '@/state/reducer'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { useAppSelector } from '@/state/store'

export type ChainflipLendingPoolWithFiat = {
  pool: ChainflipLendingPool
  assetId: AssetId | undefined
  totalAmountCryptoPrecision: string
  availableAmountCryptoPrecision: string
  owedToNetworkCryptoPrecision: string
  totalAmountFiat: string
  availableAmountFiat: string
  supplyApy: string
  borrowRate: string
}

const FIVE_MINUTES = 5 * 60 * 1000

const selectPoolFiatData = (
  state: ReduxState,
  pool: ChainflipLendingPool,
): { assetId: AssetId | undefined; precision: number; price: string } => {
  const assetId = CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[pool.asset.asset as ChainflipAssetSymbol]
  if (!assetId) return { assetId: undefined, precision: 0, price: '0' }

  const asset = selectAssetById(state, assetId)
  const marketData = selectMarketDataByAssetIdUserCurrency(state, assetId)

  return {
    assetId,
    precision: asset?.precision ?? 0,
    price: marketData?.price ?? '0',
  }
}

export const useChainflipLendingPools = () => {
  const { data: pools, isLoading } = useQuery({
    ...reactQueries.chainflipLending.lendingPools(),
    staleTime: FIVE_MINUTES,
  })

  const poolFiatData = useAppSelector(state =>
    (pools ?? []).map(pool => selectPoolFiatData(state, pool)),
  )

  const poolsWithFiat: ChainflipLendingPoolWithFiat[] = useMemo(() => {
    if (!pools) return []

    return pools.map((pool, i) => {
      const { assetId, precision, price } = poolFiatData[i]

      const totalBaseUnit = hexToBaseUnit(pool.total_amount)
      const availableBaseUnit = hexToBaseUnit(pool.available_amount)
      const owedBaseUnit = hexToBaseUnit(pool.owed_to_network)

      const totalCrypto = baseUnitToPrecision(totalBaseUnit, precision)
      const availableCrypto = baseUnitToPrecision(availableBaseUnit, precision)
      const owedCrypto = baseUnitToPrecision(owedBaseUnit, precision)

      const totalFiat = bnOrZero(totalCrypto).times(price).toFixed(2)
      const availableFiat = bnOrZero(availableCrypto).times(price).toFixed(2)

      return {
        pool,
        assetId,
        totalAmountCryptoPrecision: totalCrypto,
        availableAmountCryptoPrecision: availableCrypto,
        owedToNetworkCryptoPrecision: owedCrypto,
        totalAmountFiat: totalFiat,
        availableAmountFiat: availableFiat,
        supplyApy: permillToDecimal(pool.current_interest_rate),
        borrowRate: permillToDecimal(pool.current_interest_rate),
      }
    })
  }, [pools, poolFiatData])

  const totalSuppliedFiat = useMemo(
    () => poolsWithFiat.reduce((sum, p) => sum.plus(p.totalAmountFiat), bnOrZero(0)).toFixed(2),
    [poolsWithFiat],
  )

  const availableLiquidityFiat = useMemo(
    () => poolsWithFiat.reduce((sum, p) => sum.plus(p.availableAmountFiat), bnOrZero(0)).toFixed(2),
    [poolsWithFiat],
  )

  const totalBorrowedFiat = useMemo(
    () => bnOrZero(totalSuppliedFiat).minus(availableLiquidityFiat).toFixed(2),
    [totalSuppliedFiat, availableLiquidityFiat],
  )

  return {
    pools: poolsWithFiat,
    totalSuppliedFiat,
    availableLiquidityFiat,
    totalBorrowedFiat,
    isLoading,
  }
}
