import type { AccountId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { checkApprovalNeeded } from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { selectFirstHopSellAccountId } from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectFirstHop,
  selectLastHop,
  selectLastHopSellAccountId,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

const useIsApprovalInitiallyNeededForHop = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const tradeQuote = useAppSelector(selectActiveQuote)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isApprovalInitiallyNeeded, setIsApprovalInitiallyNeeded] = useState<boolean>(false)
  const wallet = useWallet().state.wallet

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)

      if (!wallet || !sellAssetAccountId || !tradeQuoteStep) {
        return
      }

      if (!tradeQuoteStep) {
        setIsApprovalInitiallyNeeded(false)
        setIsLoading(false)
        return
      }

      const updatedIsApprovalNeeded = await checkApprovalNeeded(
        tradeQuoteStep,
        wallet,
        sellAssetAccountId,
      )

      setIsApprovalInitiallyNeeded(updatedIsApprovalNeeded)
      setIsLoading(false)
    })()
  }, [isApprovalInitiallyNeeded, sellAssetAccountId, tradeQuote, tradeQuoteStep, wallet])

  return { isLoading, isApprovalInitiallyNeeded }
}

export const useIsApprovalInitiallyNeeded = () => {
  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)
  const firstHopSellAssetAccountId = useAppSelector(selectFirstHopSellAccountId)
  const lastHopSellAssetAccountId = useAppSelector(selectLastHopSellAccountId)

  const {
    isLoading: isFirstHopLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForFirstHop,
  } = useIsApprovalInitiallyNeededForHop(firstHop, firstHopSellAssetAccountId)
  const {
    isLoading: isLastHopLoading,
    isApprovalInitiallyNeeded: isApprovalInitiallyNeededForLastHop,
  } = useIsApprovalInitiallyNeededForHop(lastHop, lastHopSellAssetAccountId)

  return {
    isLoading: isFirstHopLoading || isLastHopLoading,
    isApprovalInitiallyNeeded: [
      isApprovalInitiallyNeededForFirstHop,
      isApprovalInitiallyNeededForLastHop,
    ] as [boolean, boolean],
  }
}
