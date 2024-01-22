import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import type { ConfirmedQuote } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'

import { ReusableLpConfirm } from '../ReusableLpConfirm'
import { AddLiquidityRoutePaths } from './types'

type AddLiquidityConfirmProps = {
  confirmedQuote: ConfirmedQuote
}

export const AddLiquidityConfirm = ({ confirmedQuote }: AddLiquidityConfirmProps) => {
  const history = useHistory()

  const { opportunityId } = confirmedQuote

  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === opportunityId)
  }, [opportunityId, parsedPools])

  const handleBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  const handleConfirm = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Status)
  }, [history])

  if (!foundPool) return null

  return (
    <ReusableLpConfirm
      pool={foundPool}
      baseAssetId={thorchainAssetId}
      confirmedQuote={confirmedQuote}
      handleBack={handleBack}
      handleConfirm={handleConfirm}
    />
  )
}
