import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import type { LpConfirmedWithdrawalQuote } from 'lib/utils/thorchain/lp/types'

import { ReusableLpStatus } from '../ReusableLpStatus/ReusableLpStatus'
import { RemoveLiquidityRoutePaths } from './types'

type RemoveLiquidityStatusProps = {
  confirmedQuote: LpConfirmedWithdrawalQuote
}

export const RemoveLiquidityStatus = ({ confirmedQuote }: RemoveLiquidityStatusProps) => {
  const history = useHistory()

  const handleGoBack = useCallback(() => {
    history.push(RemoveLiquidityRoutePaths.Input)
  }, [history])

  return (
    <ReusableLpStatus
      confirmedQuote={confirmedQuote}
      baseAssetId={thorchainAssetId}
      handleBack={handleGoBack}
    />
  )
}
