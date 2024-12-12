import type { SupportedTradeQuoteStepIndex } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
  selectIsActiveQuoteMultiHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

/**
 * Returns the index of the currently executing hop (0 or 1), or undefined if no hop is currently active
 * A hop is considered "current" if it's in an active state (awaiting user action or executing)
 */
export const useCurrentHopIndex: () => SupportedTradeQuoteStepIndex | undefined = () => {
  const activeQuote = useAppSelector(selectActiveQuote)
  const isMultiHop = useAppSelector(selectIsActiveQuoteMultiHop)

  const firstHopMetadata = useSelectorWithArgs(selectHopExecutionMetadata, {
    tradeId: activeQuote?.id ?? '',
    hopIndex: 0,
  })

  const secondHopMetadata = useSelectorWithArgs(selectHopExecutionMetadata, {
    tradeId: activeQuote?.id ?? '',
    hopIndex: 1,
  })

  return useMemo(() => {
    if (!activeQuote) return undefined

    const activeStates: HopExecutionState[] = [
      HopExecutionState.AwaitingAllowanceReset,
      HopExecutionState.AwaitingAllowanceApproval,
      HopExecutionState.AwaitingPermit2,
      HopExecutionState.AwaitingSwap,
    ]

    // Check if first hop is active
    if (activeStates.includes(firstHopMetadata.state)) {
      return 0
    }

    // Check if second hop is active (only for multi-hop trades)
    if (isMultiHop && activeStates.includes(secondHopMetadata.state)) {
      return 1
    }

    // If first hop is complete and we're not in a multi-hop trade, we're done
    if (!isMultiHop && firstHopMetadata.state === HopExecutionState.Complete) {
      return undefined
    }

    // If first hop is complete and second hop hasn't started, we're transitioning
    if (
      isMultiHop &&
      firstHopMetadata.state === HopExecutionState.Complete &&
      secondHopMetadata.state === HopExecutionState.Pending
    ) {
      return 1
    }

    // If both hops are complete or in an unexpected state
    if (
      firstHopMetadata.state === HopExecutionState.Complete &&
      (!isMultiHop || secondHopMetadata.state === HopExecutionState.Complete)
    ) {
      return undefined
    }

    // Default to first hop if we can't determine the current state
    return 0
  }, [activeQuote, isMultiHop, firstHopMetadata.state, secondHopMetadata.state])
}
