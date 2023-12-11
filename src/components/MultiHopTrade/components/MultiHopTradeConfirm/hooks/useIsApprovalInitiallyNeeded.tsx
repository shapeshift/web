import type { AccountId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { selectFirstHopSellAccountId } from 'state/slices/selectors'
import {
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
  selectSecondHopSellAccountId,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useIsApprovalNeeded } from './useIsApprovalNeeded'

const useIsApprovalInitiallyNeededForHop = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const [watchIsApprovalNeeded, setWatchIsApprovalNeeded] = useState<boolean>(true)
  const [isApprovalInitiallyNeeded, setIsApprovalInitiallyNeeded] = useState<boolean | undefined>()

  const { isLoading, isApprovalNeeded } = useIsApprovalNeeded(
    tradeQuoteStep,
    sellAssetAccountId,
    watchIsApprovalNeeded,
  )

  useEffect(() => {
    // stop polling on first result
    if (!isLoading && isApprovalNeeded !== undefined) {
      setWatchIsApprovalNeeded(false)
      setIsApprovalInitiallyNeeded(isApprovalNeeded)
    }
  }, [isApprovalNeeded, isLoading])

  return {
    isLoading: isApprovalInitiallyNeeded === undefined || isLoading,
    isApprovalInitiallyNeeded,
  }
}

export const useIsApprovalInitiallyNeeded = () => {
  const dispatch = useAppDispatch()
  const firstHop = useAppSelector(selectFirstHop)
  const secondHop = useAppSelector(selectSecondHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const firstHopSellAssetAccountId = useAppSelector(selectFirstHopSellAccountId)
  const secondHopSellAssetAccountId = useAppSelector(selectSecondHopSellAccountId)

  const {
    isLoading: isFirstHopLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForFirstHop,
  } = useIsApprovalInitiallyNeededForHop(firstHop, firstHopSellAssetAccountId)

  const {
    isLoading: isSecondHopLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForSecondHop,
  } = useIsApprovalInitiallyNeededForHop(secondHop, secondHopSellAssetAccountId)

  useEffect(() => {
    if (isFirstHopLoading || (secondHop !== undefined && isSecondHopLoading)) return
    dispatch(
      tradeQuoteSlice.actions.setInitialApprovalRequirements({
        firstHop: isApprovalInitiallyNeededForFirstHop ?? false,
        secondHop: isApprovalInitiallyNeededForSecondHop ?? false,
      }),
    )
  }, [
    dispatch,
    isApprovalInitiallyNeededForFirstHop,
    isApprovalInitiallyNeededForSecondHop,
    isFirstHopLoading,
    isSecondHopLoading,
    secondHop,
  ])

  return { isLoading: isFirstHopLoading || (isMultiHopTrade && isSecondHopLoading) }
}
