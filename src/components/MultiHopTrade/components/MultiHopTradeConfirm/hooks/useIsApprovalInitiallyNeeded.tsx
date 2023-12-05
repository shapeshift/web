import type { AccountId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { selectFirstHopSellAccountId } from 'state/slices/selectors'
import {
  selectFirstHop,
  selectSecondHop,
  selectSecondHopSellAccountId,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { useIsApprovalNeeded } from './useIsApprovalNeeded'

const useIsApprovalInitiallyNeededForHop = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const [watchIsApprovalNeeded, setWatchIsApprovalNeeded] = useState<boolean>(true)
  const [isApprovalInitiallyNeeded, setIsApprovalInitiallyNeeded] = useState<boolean>(false)

  const { isLoading, isApprovalNeeded } = useIsApprovalNeeded({
    tradeQuoteStep,
    sellAssetAccountId,
    watch: watchIsApprovalNeeded,
  })

  useEffect(() => {
    // stop polling on first result
    if (!isLoading && isApprovalNeeded !== undefined) {
      setWatchIsApprovalNeeded(false)
      setIsApprovalInitiallyNeeded(isApprovalNeeded)
    }
  }, [isApprovalNeeded, isLoading])

  return { isLoading, isApprovalInitiallyNeeded }
}

export const useIsApprovalInitiallyNeeded = () => {
  const firstHop = useAppSelector(selectFirstHop)
  const secondHop = useAppSelector(selectSecondHop)
  const FirstHopSellAssetAccountId = useAppSelector(selectFirstHopSellAccountId)
  const SecondHopSellAssetAccountId = useAppSelector(selectSecondHopSellAccountId)

  const {
    isLoading: isFirstHopLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForFirstHop,
  } = useIsApprovalInitiallyNeededForHop(firstHop, FirstHopSellAssetAccountId)

  const {
    isLoading: isSecondHopLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForSecondHop,
  } = useIsApprovalInitiallyNeededForHop(secondHop, SecondHopSellAssetAccountId)

  return {
    isLoading: isFirstHopLoading || isSecondHopLoading,
    isApprovalInitiallyNeeded: {
      firstHop: isApprovalInitiallyNeededForFirstHop,
      secondHop: isApprovalInitiallyNeededForSecondHop,
    },
  }
}
