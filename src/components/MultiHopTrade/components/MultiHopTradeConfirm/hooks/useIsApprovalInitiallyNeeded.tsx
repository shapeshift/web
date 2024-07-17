import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useEffect, useMemo, useState } from 'react'
import { selectFirstHopSellAccountId, selectSecondHopSellAccountId } from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useIsApprovalNeeded } from './useIsApprovalNeeded'

const useIsApprovalInitiallyNeededForHop = (
  tradeQuoteId: string | undefined,
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const [isApprovalInitiallyNeeded, setIsApprovalInitiallyNeeded] = useState<boolean | undefined>()
  const [isAllowanceResetNeeded, setIsAllowanceResetNeeded] = useState<boolean | undefined>()

  const {
    isLoading,
    isFetching,
    data: isApprovalNeededData,
  } = useIsApprovalNeeded(tradeQuoteStep, sellAssetAccountId)

  useEffect(() => {
    // We already have *initial* approval requirements. The whole intent of this hook is to return initial allowance requirements,
    // so we never want to overwrite them with subsequent allowance results.
    if (isApprovalInitiallyNeeded !== undefined) return

    if (!isLoading && !isFetching && isApprovalNeededData?.isApprovalNeeded !== undefined) {
      setIsApprovalInitiallyNeeded(isApprovalNeededData?.isApprovalNeeded)
    }
  }, [isApprovalInitiallyNeeded, isApprovalNeededData, isFetching, isLoading])

  useEffect(() => {
    // We already have *initial* approval requirements. The whole intent of this hook is to return initial allowance requirements,
    // so we never want to overwrite them with subsequent allowance results.
    if (isAllowanceResetNeeded !== undefined) return

    if (!isLoading && !isFetching && isApprovalNeededData?.isAllowanceResetNeeded !== undefined) {
      setIsAllowanceResetNeeded(isApprovalNeededData?.isAllowanceResetNeeded)
    }
  }, [isAllowanceResetNeeded, isApprovalNeededData, isFetching, isLoading])

  // Reset the approval requirements if the trade quote ID changes
  useEffect(() => {
    setIsApprovalInitiallyNeeded(undefined)
    setIsAllowanceResetNeeded(undefined)
  }, [tradeQuoteId])

  const result = useMemo(
    () => ({
      isLoading: isLoading || isFetching,
      isApprovalInitiallyNeeded,
      isAllowanceResetNeeded,
    }),
    [isLoading, isFetching, isApprovalInitiallyNeeded, isAllowanceResetNeeded],
  )

  return result
}

export const useIsApprovalInitiallyNeeded = () => {
  const dispatch = useAppDispatch()
  const activeQuote = useAppSelector(selectActiveQuote)
  const firstHop = useAppSelector(selectFirstHop)
  const secondHop = useAppSelector(selectSecondHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const firstHopSellAssetAccountId = useAppSelector(selectFirstHopSellAccountId)
  const secondHopSellAssetAccountId = useAppSelector(selectSecondHopSellAccountId)

  const {
    isLoading: isFirstHopLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForFirstHop,
    isAllowanceResetNeeded: isAllowanceResetNeededForFirstHop,
  } = useIsApprovalInitiallyNeededForHop(activeQuote?.id, firstHop, firstHopSellAssetAccountId)

  const {
    isLoading: isSecondHopLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForSecondHop,
    isAllowanceResetNeeded: isAllowanceResetNeededForSecondHop,
  } = useIsApprovalInitiallyNeededForHop(activeQuote?.id, secondHop, secondHopSellAssetAccountId)

  useEffect(() => {
    if (isFirstHopLoading || (secondHop !== undefined && isSecondHopLoading)) return

    dispatch(
      tradeQuoteSlice.actions.setInitialApprovalRequirements({
        firstHop: isApprovalInitiallyNeededForFirstHop ?? false,
        secondHop: isApprovalInitiallyNeededForSecondHop ?? false,
      }),
    )

    dispatch(
      tradeQuoteSlice.actions.setAllowanceResetRequirements({
        firstHop: isAllowanceResetNeededForFirstHop ?? false,
        secondHop: isAllowanceResetNeededForSecondHop ?? false,
      }),
    )
  }, [
    dispatch,
    isAllowanceResetNeededForFirstHop,
    isAllowanceResetNeededForSecondHop,
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
