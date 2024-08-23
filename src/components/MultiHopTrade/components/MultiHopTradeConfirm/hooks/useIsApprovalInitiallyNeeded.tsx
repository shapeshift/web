import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useEffect, useMemo, useState } from 'react'
import { useIsApprovalRequired } from 'hooks/queries/useIsApprovalRequired'
import { selectFirstHopSellAccountId, selectSecondHopSellAccountId } from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

const useIsApprovalInitiallyNeededForHop = (
  tradeQuoteId: string | undefined,
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const [isApprovalInitiallyNeeded, setIsApprovalInitiallyNeeded] = useState<boolean | undefined>()
  const [isAllowanceResetNeeded, setIsAllowanceResetNeeded] = useState<boolean | undefined>()

  const { allowanceCryptoBaseUnitResult, isApprovalRequired, isAllowanceResetRequired } =
    useIsApprovalRequired({
      amountCryptoBaseUnit: tradeQuoteStep?.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      assetId: tradeQuoteStep?.sellAsset.assetId,
      from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
      spender: tradeQuoteStep?.allowanceContract,
    })

  // Reset the approval requirements if the trade quote ID changes
  // IMPORTANT: This must be evaluated before the other useEffects to ensure that the initial approval requirements are reset
  useEffect(() => {
    setIsApprovalInitiallyNeeded(undefined)
    setIsAllowanceResetNeeded(undefined)
  }, [tradeQuoteId])

  useEffect(() => {
    // We already have *initial* approval requirements. The whole intent of this hook is to return initial allowance requirements,
    // so we never want to overwrite them with subsequent allowance results.
    if (isApprovalInitiallyNeeded !== undefined) return
    if (allowanceCryptoBaseUnitResult.isLoading || isApprovalRequired === undefined) return

    setIsApprovalInitiallyNeeded(isApprovalRequired)
  }, [allowanceCryptoBaseUnitResult.isLoading, isApprovalInitiallyNeeded, isApprovalRequired])

  useEffect(() => {
    // We already have *initial* approval requirements. The whole intent of this hook is to return initial allowance requirements,
    // so we never want to overwrite them with subsequent allowance results.
    if (isAllowanceResetNeeded !== undefined) return
    if (allowanceCryptoBaseUnitResult.isLoading || isAllowanceResetRequired === undefined) return

    setIsAllowanceResetNeeded(isAllowanceResetRequired)
  }, [allowanceCryptoBaseUnitResult, isAllowanceResetNeeded, isAllowanceResetRequired])

  return useMemo(() => {
    return {
      isLoading: allowanceCryptoBaseUnitResult.isLoading,
      isApprovalInitiallyNeeded,
      isAllowanceResetNeeded,
    }
  }, [allowanceCryptoBaseUnitResult, isApprovalInitiallyNeeded, isAllowanceResetNeeded])
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
  }, [
    activeQuote?.id,
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
    () => ({ isLoading: isFirstHopLoading || (Boolean(isMultiHopTrade) && isSecondHopLoading) }),
    [isFirstHopLoading, isMultiHopTrade, isSecondHopLoading],
  )

  return result
}
