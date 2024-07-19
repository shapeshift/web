import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useEffect, useMemo, useState } from 'react'
import { useIsApprovalRequired } from 'hooks/queries/useIsApprovalRequired'
import { selectFirstHopSellAccountId, selectSecondHopSellAccountId } from 'state/slices/selectors'
import {
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

const useIsApprovalInitiallyNeededForHop = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const [isApprovalInitiallyNeeded, setIsApprovalInitiallyNeeded] = useState<boolean | undefined>()

  const { allowanceQueryResult, isApprovalRequired } = useIsApprovalRequired({
    amountCryptoBaseUnit: tradeQuoteStep?.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    assetId: tradeQuoteStep?.sellAsset.assetId,
    from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
    spender: tradeQuoteStep?.allowanceContract,
  })

  useEffect(() => {
    // We already have *initial* approval requirements. The whole intent of this hook is to return initial allowance requirements,
    // so we never want to overwrite them with subsequent allowance results.
    if (isApprovalInitiallyNeeded !== undefined) return
    // stop polling on first result
    if (allowanceQueryResult.isLoading || isApprovalRequired === undefined) return

    setIsApprovalInitiallyNeeded(isApprovalRequired)
  }, [allowanceQueryResult.isLoading, isApprovalInitiallyNeeded, isApprovalRequired])

  return useMemo(() => {
    return {
      isLoading: isApprovalInitiallyNeeded === undefined,
      isApprovalInitiallyNeeded,
    }
  }, [isApprovalInitiallyNeeded])
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
    () => ({ isLoading: isFirstHopLoading || (Boolean(isMultiHopTrade) && isSecondHopLoading) }),
    [isFirstHopLoading, isMultiHopTrade, isSecondHopLoading],
  )

  return result
}
