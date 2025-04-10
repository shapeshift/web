import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { ReusableLpStatus } from '../ReusableLpStatus/ReusableLpStatus'
import { AddLiquidityRoutePaths } from './types'

import type { LpConfirmedDepositQuote } from '@/lib/utils/thorchain/lp/types'

type AddLiquidityStatusProps = {
  confirmedQuote: LpConfirmedDepositQuote
}

export const AddLiquidityStatus = ({ confirmedQuote }: AddLiquidityStatusProps) => {
  const navigate = useNavigate()

  const handleGoBack = useCallback(() => {
    if (confirmedQuote.positionStatus?.incomplete) return navigate(AddLiquidityRoutePaths.Input)
    navigate(AddLiquidityRoutePaths.Confirm)
  }, [confirmedQuote.positionStatus, navigate])

  const handleGoInput = useCallback(() => {
    navigate(AddLiquidityRoutePaths.Input)
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
