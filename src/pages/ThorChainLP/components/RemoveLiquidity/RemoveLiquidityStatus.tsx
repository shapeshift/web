import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { ReusableLpStatus } from '../ReusableLpStatus/ReusableLpStatus'
import { RemoveLiquidityRoutePaths } from './types'

import type { LpConfirmedWithdrawalQuote } from '@/lib/utils/thorchain/lp/types'

type RemoveLiquidityStatusProps = {
  confirmedQuote: LpConfirmedWithdrawalQuote
}

export const RemoveLiquidityStatus = ({ confirmedQuote }: RemoveLiquidityStatusProps) => {
  const navigate = useNavigate()

  const handleGoBack = useCallback(() => {
    navigate(RemoveLiquidityRoutePaths.Confirm)
  }, [navigate])

  const handleGoInput = useCallback(() => {
    navigate(RemoveLiquidityRoutePaths.Input)
  }, [navigate])

  return (
    <ReusableLpStatus
      confirmedQuote={confirmedQuote}
      baseAssetId={thorchainAssetId}
      handleBack={handleGoBack}
      handleRestart={handleGoInput}
    />
  )
}
