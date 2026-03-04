import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { reactQueries } from '@/react-queries'

export type LtvThresholds = {
  target: number
  topup: number
  softLiquidation: number
  softLiquidationAbort: number
  hardLiquidation: number
  hardLiquidationAbort: number
  lowLtv: number
}

const PERMILL_DIVISOR = 1_000_000
const TEN_MINUTES = 10 * 60 * 1000

const permillToDecimal = (permill: number): number => permill / PERMILL_DIVISOR

export const useChainflipLtvThresholds = () => {
  const { data: lendingConfig, isLoading } = useQuery({
    ...reactQueries.chainflipLending.lendingConfig(),
    staleTime: TEN_MINUTES,
  })

  const thresholds: LtvThresholds | undefined = useMemo(() => {
    if (!lendingConfig) return undefined

    const raw = lendingConfig.ltv_thresholds

    return {
      target: permillToDecimal(raw.target),
      topup: permillToDecimal(raw.topup),
      softLiquidation: permillToDecimal(raw.soft_liquidation),
      softLiquidationAbort: permillToDecimal(raw.soft_liquidation_abort),
      hardLiquidation: permillToDecimal(raw.hard_liquidation),
      hardLiquidationAbort: permillToDecimal(raw.hard_liquidation_abort),
      lowLtv: permillToDecimal(raw.low_ltv),
    }
  }, [lendingConfig])

  return useMemo(
    () => ({
      thresholds,
      isLoading,
    }),
    [thresholds, isLoading],
  )
}
