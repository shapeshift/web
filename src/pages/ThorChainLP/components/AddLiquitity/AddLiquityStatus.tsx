import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { type LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'

import { ReusableLpStatus } from '../ReusableLpStatus/ReusableLpStatus'
import { AddLiquidityRoutePaths } from './types'

type AddLiquidityStatusProps = {
  confirmedQuote: LpConfirmedDepositQuote
}

export const AddLiquidityStatus = ({ confirmedQuote }: AddLiquidityStatusProps) => {
  const history = useHistory()

  const handleGoBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  return (
    <ReusableLpStatus
      confirmedQuote={confirmedQuote}
      baseAssetId={thorchainAssetId}
      handleBack={handleGoBack}
    />
  )
}
