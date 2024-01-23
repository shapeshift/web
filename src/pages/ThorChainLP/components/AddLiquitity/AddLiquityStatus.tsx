import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'
import { useHistory } from 'react-router'
import { assertUnreachable } from 'lib/utils'
import { AsymSide, type ConfirmedQuote } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ReusableLpStatus } from '../ReusableLpStatus/ReusableLpStatus'
import { AddLiquidityRoutePaths } from './types'

type AddLiquidityStatusProps = {
  confirmedQuote: ConfirmedQuote
}

export const AddLiquidityStatus = ({ confirmedQuote }: AddLiquidityStatusProps) => {
  const history = useHistory()
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  const { opportunityId } = confirmedQuote

  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === opportunityId)
  }, [opportunityId, parsedPools])

  const asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const assets: Asset[] = useMemo(() => {
    if (!(foundPool && asset && rune)) return []

    switch (foundPool.asymSide) {
      case null:
        return [rune, asset]
      case AsymSide.Rune:
        return [rune]
      case AsymSide.Asset:
        return [asset]
      default:
        assertUnreachable(foundPool.asymSide)
    }
  }, [asset, foundPool, rune])

  const handleGoBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  const handleComplete = useCallback(() => {
    setActiveStepIndex(activeStepIndex + 1)
  }, [activeStepIndex])

  // This allows us to either do a single step or multiple steps
  // Once a step is complete the next step is shown
  // If the active step is the same as the length of steps we can assume it is complete.
  const isComplete = useMemo(() => {
    return activeStepIndex === assets.length
  }, [activeStepIndex, assets.length])

  return (
    <ReusableLpStatus
      confirmedQuote={confirmedQuote}
      baseAssetId={thorchainAssetId}
      handleBack={handleGoBack}
      isComplete={isComplete}
      activeStepIndex={activeStepIndex}
      onStepComplete={handleComplete}
    />
  )
}
