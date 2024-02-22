import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import type { LpConfirmedWithdrawalQuote } from 'lib/utils/thorchain/lp/types'

import { ReusableLpConfirm } from '../ReusableLpConfirm'
import { RemoveLiquidityRoutePaths } from './types'

type RemoveLiquidityConfirmProps = {
  confirmedQuote: LpConfirmedWithdrawalQuote
}

export const RemoveLiquidityConfirm = ({ confirmedQuote }: RemoveLiquidityConfirmProps) => {
  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push(RemoveLiquidityRoutePaths.Input)
  }, [history])

  const handleConfirm = useCallback(() => {
    history.push(RemoveLiquidityRoutePaths.Status)
  }, [history])

  return (
    <ReusableLpConfirm
      baseAssetId={thorchainAssetId}
      confirmedQuote={confirmedQuote}
      handleBack={handleBack}
      handleConfirm={handleConfirm}
    />
  )
}
