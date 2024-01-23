import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import type { ConfirmedQuote } from 'lib/utils/thorchain/lp/types'

import { ReusableLpConfirm } from '../ReusableLpConfirm'
import { AddLiquidityRoutePaths } from './types'

type AddLiquidityConfirmProps = {
  confirmedQuote: ConfirmedQuote
}

export const AddLiquidityConfirm = ({ confirmedQuote }: AddLiquidityConfirmProps) => {
  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  const handleConfirm = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Status)
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
