import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { reactQueries } from '@/react-queries'

const USD_PRECISION = 6
const TEN_MINUTES = 10 * 60 * 1000

const hexToUsd = (hex: string): string => {
  try {
    const baseUnit = BigInt(hex).toString()
    return bnOrZero(baseUnit).div(bnOrZero(10).pow(USD_PRECISION)).toFixed()
  } catch {
    return '0'
  }
}

export const useChainflipBorrowMinimums = () => {
  const { data: lendingConfig, isLoading } = useQuery({
    ...reactQueries.chainflipLending.lendingConfig(),
    staleTime: TEN_MINUTES,
  })

  return useMemo(() => {
    if (!lendingConfig) {
      return {
        minimumLoanAmountUsd: undefined,
        minimumUpdateLoanAmountUsd: undefined,
        minimumUpdateCollateralAmountUsd: undefined,
        isLoading,
      }
    }

    return {
      minimumLoanAmountUsd: hexToUsd(lendingConfig.minimum_loan_amount_usd),
      minimumUpdateLoanAmountUsd: hexToUsd(lendingConfig.minimum_update_loan_amount_usd),
      minimumUpdateCollateralAmountUsd: hexToUsd(
        lendingConfig.minimum_update_collateral_amount_usd,
      ),
      isLoading,
    }
  }, [lendingConfig, isLoading])
}
