import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'

import { ReusableLpStatus } from '../ReusableLpStatus/ReusableLpStatus'
import { RemoveLiquidityRoutePaths } from './types'

import type { LpConfirmedWithdrawalQuote } from '@/lib/utils/thorchain/lp/types'

type RemoveLiquidityStatusProps = {
  confirmedQuote: LpConfirmedWithdrawalQuote
}

export const RemoveLiquidityStatus = ({ confirmedQuote }: RemoveLiquidityStatusProps) => {
  const history = useHistory()

  const handleGoBack = useCallback(() => {
    history.push(RemoveLiquidityRoutePaths.Confirm)
  }, [history])

  const handleGoInput = useCallback(() => {
    history.push(RemoveLiquidityRoutePaths.Input)
  }, [history])

  return (
    <ReusableLpStatus
      confirmedQuote={confirmedQuote}
      baseAssetId={thorchainAssetId}
      handleBack={handleGoBack}
      handleRestart={handleGoInput}
    />
  )
}
