import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { reactQueries } from '@/react-queries'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { useAppSelector } from '@/state/store'

const USD_PRECISION = 6
const TEN_MINUTES = 10 * 60 * 1000

export const useChainflipMinimumSupply = (assetId: AssetId) => {
  const { data: lendingConfig, isLoading } = useQuery({
    ...reactQueries.chainflipLending.lendingConfig(),
    staleTime: TEN_MINUTES,
  })

  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  return useMemo(() => {
    if (!lendingConfig) return { minSupply: undefined, minSupplyUsd: undefined, isLoading }

    const minHex = lendingConfig.minimum_supply_amount_usd
    if (!minHex) return { minSupply: undefined, minSupplyUsd: undefined, isLoading }

    try {
      const minBaseUnit = BigInt(minHex).toString()
      const minUsd = bnOrZero(minBaseUnit).div(bnOrZero(10).pow(USD_PRECISION)).toFixed()
      const price = bnOrZero(marketData?.price)

      const minCrypto = price.gt(0) ? bnOrZero(minUsd).div(price).toFixed() : undefined

      return {
        minSupply: minCrypto,
        minSupplyUsd: minUsd,
        isLoading,
      }
    } catch {
      return { minSupply: undefined, minSupplyUsd: undefined, isLoading }
    }
  }, [lendingConfig, marketData?.price, isLoading])
}
