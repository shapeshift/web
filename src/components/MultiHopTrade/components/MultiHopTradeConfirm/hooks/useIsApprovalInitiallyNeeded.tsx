import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useEffect, useMemo, useState } from 'react'
import { selectFirstHopSellAccountId, selectSecondHopSellAccountId } from 'state/slices/selectors'
import {
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useIsApprovalNeeded } from './useIsApprovalNeeded'

const useIsApprovalInitiallyNeededForHop = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const [isApprovalInitiallyNeeded, setIsApprovalInitiallyNeeded] = useState<boolean | undefined>()

  const { isLoading, isApprovalNeeded } = useIsApprovalNeeded(tradeQuoteStep, sellAssetAccountId)

  useEffect(() => {
    // We already have *initial* approval requirements. The whole intent of this hook is to return initial allowance requirements,
    // so we never want to overwrite them with subsequent allowance results.
    if (isApprovalInitiallyNeeded !== undefined) return
    // stop polling on first result
    if (!isLoading && isApprovalNeeded !== undefined) {
      setIsApprovalInitiallyNeeded(isApprovalNeeded)
    }
  }, [isApprovalInitiallyNeeded, isApprovalNeeded, isLoading])

  const result = useMemo(
    () => ({
      isLoading: isApprovalInitiallyNeeded === undefined || isLoading,
      isApprovalInitiallyNeeded,
    }),
    [isApprovalInitiallyNeeded, isLoading],
  )

  return result
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

  const result = useMemo(
    () => ({ isLoading: isFirstHopLoading || (isMultiHopTrade && isSecondHopLoading) }),
    [isFirstHopLoading, isMultiHopTrade, isSecondHopLoading],
  )

  return result
}
