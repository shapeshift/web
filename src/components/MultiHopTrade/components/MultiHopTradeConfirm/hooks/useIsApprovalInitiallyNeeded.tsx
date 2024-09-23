import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { type TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useEffect, useMemo, useState } from 'react'
import { useIsAllowanceApprovalRequired } from 'hooks/queries/useIsAllowanceApprovalRequired'
import { useIsAllowanceResetRequired } from 'hooks/queries/useIsAllowanceResetRequired'
import { selectFirstHopSellAccountId, selectSecondHopSellAccountId } from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { isPermit2Hop } from './helpers'

const useIsApprovalInitiallyNeededForHop = (
  tradeQuoteId: string | undefined,
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const [isApprovalInitiallyNeeded, setIsApprovalInitiallyNeeded] = useState<boolean | undefined>()

  const { allowanceCryptoBaseUnitResult, isAllowanceApprovalRequired } =
    useIsAllowanceApprovalRequired({
      amountCryptoBaseUnit: tradeQuoteStep?.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      assetId: tradeQuoteStep?.sellAsset.assetId,
      from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
      spender: tradeQuoteStep?.allowanceContract,
    })

  // Reset the approval requirements if the trade quote ID changes
  // IMPORTANT: This must be evaluated before the other useEffects to ensure that the initial approval requirements are reset
  useEffect(() => {
    setIsApprovalInitiallyNeeded(undefined)
  }, [tradeQuoteId])

  useEffect(() => {
    // We already have *initial* approval requirements. The whole intent of this hook is to return initial allowance requirements,
    // so we never want to overwrite them with subsequent allowance results.
    if (isApprovalInitiallyNeeded !== undefined) return
    if (allowanceCryptoBaseUnitResult.isLoading || isAllowanceApprovalRequired === undefined) return

    setIsApprovalInitiallyNeeded(isAllowanceApprovalRequired)
  }, [
    allowanceCryptoBaseUnitResult.isLoading,
    isApprovalInitiallyNeeded,
    isAllowanceApprovalRequired,
  ])

  return {
    isLoading: allowanceCryptoBaseUnitResult.isLoading,
    isApprovalInitiallyNeeded,
  }
}

const useIsAllowanceResetInitiallyRequiredForHop = (
  tradeQuoteId: string | undefined,
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const [isAllowanceResetNeeded, setIsAllowanceResetNeeded] = useState<boolean | undefined>()

  const isPermit2 = useMemo(() => {
    return isPermit2Hop(tradeQuoteStep)
  }, [tradeQuoteStep])

  const { isAllowanceResetRequired, isLoading } = useIsAllowanceResetRequired({
    amountCryptoBaseUnit: tradeQuoteStep?.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    assetId: tradeQuoteStep?.sellAsset.assetId,
    from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
    spender: tradeQuoteStep?.allowanceContract,
    isDisabled: isPermit2,
  })

  // Reset the approval requirements if the trade quote ID changes
  // IMPORTANT: This must be evaluated before the other useEffects to ensure that the initial approval requirements are reset
  useEffect(() => {
    setIsAllowanceResetNeeded(undefined)
  }, [tradeQuoteId])

  useEffect(() => {
    // Allowance resets are never required for permit2
    if (isPermit2) {
      setIsAllowanceResetNeeded(false)
    }

    // We already have *initial* approval requirements. The whole intent of this hook is to return initial allowance requirements,
    // so we never want to overwrite them with subsequent allowance results.
    if (isAllowanceResetNeeded !== undefined) return
    if (isLoading || isAllowanceResetRequired === undefined) return

    setIsAllowanceResetNeeded(isAllowanceResetRequired)
  }, [isLoading, isAllowanceResetNeeded, isAllowanceResetRequired, isPermit2])

  return {
    isLoading: !isPermit2 && isLoading,
    isAllowanceResetNeeded,
  }
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
    isLoading: isFirstHopAllowanceApprovalRequirementsLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForFirstHop,
  } = useIsApprovalInitiallyNeededForHop(activeQuote?.id, firstHop, firstHopSellAssetAccountId)

  const {
    isLoading: isSecondHopAllowanceApprovalRequirementsLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForSecondHop,
  } = useIsApprovalInitiallyNeededForHop(activeQuote?.id, secondHop, secondHopSellAssetAccountId)

  const {
    isLoading: isFirstHopAllowanceResetRequirementsLoading,
    isAllowanceResetNeeded: isAllowanceResetNeededForFirstHop,
  } = useIsAllowanceResetInitiallyRequiredForHop(
    activeQuote?.id,
    firstHop,
    firstHopSellAssetAccountId,
  )

  const {
    isLoading: isSecondHopAllowanceResetRequirementsLoading,
    isAllowanceResetNeeded: isAllowanceResetNeededForSecondHop,
  } = useIsAllowanceResetInitiallyRequiredForHop(
    activeQuote?.id,
    secondHop,
    secondHopSellAssetAccountId,
  )

  const isPermit2InitiallyRequiredForFirstHop = useMemo(() => {
    return isPermit2Hop(firstHop)
  }, [firstHop])

  const isPermit2InitiallyRequiredForSecondHop = useMemo(() => {
    return isPermit2Hop(secondHop)
  }, [secondHop])

  const isFirstHopLoading =
    isFirstHopAllowanceApprovalRequirementsLoading || isFirstHopAllowanceResetRequirementsLoading
  const isSecondHopLoading =
    isSecondHopAllowanceApprovalRequirementsLoading || isSecondHopAllowanceResetRequirementsLoading

  useEffect(() => {
    if (isFirstHopLoading || (secondHop !== undefined && isSecondHopLoading)) return
    if (!activeQuote?.id) return

    dispatch(
      tradeQuoteSlice.actions.setInitialApprovalRequirements({
        id: activeQuote.id,
        firstHop: isApprovalInitiallyNeededForFirstHop ?? false,
        secondHop: isApprovalInitiallyNeededForSecondHop ?? false,
      }),
    )

    dispatch(
      tradeQuoteSlice.actions.setAllowanceResetRequirements({
        id: activeQuote.id,
        firstHop: isAllowanceResetNeededForFirstHop ?? false,
        secondHop: isAllowanceResetNeededForSecondHop ?? false,
      }),
    )

    dispatch(
      tradeQuoteSlice.actions.setPermit2Requirements({
        id: activeQuote.id,
        firstHop: isPermit2InitiallyRequiredForFirstHop,
        secondHop: isPermit2InitiallyRequiredForSecondHop,
      }),
    )
  }, [
    activeQuote?.id,
    dispatch,
    isAllowanceResetNeededForFirstHop,
    isAllowanceResetNeededForSecondHop,
    isApprovalInitiallyNeededForFirstHop,
    isApprovalInitiallyNeededForSecondHop,
    isFirstHopLoading,
    isPermit2InitiallyRequiredForFirstHop,
    isPermit2InitiallyRequiredForSecondHop,
    isSecondHopLoading,
    secondHop,
  ])

  const result = useMemo(
    () => ({ isLoading: isFirstHopLoading || (Boolean(isMultiHopTrade) && isSecondHopLoading) }),
    [isFirstHopLoading, isMultiHopTrade, isSecondHopLoading],
  )

  return result
}
