import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useLocation } from 'wouter'

import { ReusableLpStatus } from '../ReusableLpStatus/ReusableLpStatus'
import { RemoveLiquidityRoutePaths } from './types'

import type { LpConfirmedWithdrawalQuote } from '@/lib/utils/thorchain/lp/types'

type RemoveLiquidityStatusProps = {
  confirmedQuote: LpConfirmedWithdrawalQuote
}

export const RemoveLiquidityStatus = ({ confirmedQuote }: RemoveLiquidityStatusProps) => {
  const [, setLocation] = useLocation()

  const handleGoBack = useCallback(() => {
    setLocation(RemoveLiquidityRoutePaths.Confirm)
  }, [setLocation])

  const handleGoInput = useCallback(() => {
    setLocation(RemoveLiquidityRoutePaths.Input)
  }, [setLocation])

  return (
    <ReusableLpStatus
      confirmedQuote={confirmedQuote}
      baseAssetId={thorchainAssetId}
      handleBack={handleGoBack}
      handleRestart={handleGoInput}
    />
  )
}
