import type { SupportedTradeQuoteStepIndex } from '@shapeshiftoss/swapper'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
  selectIsActiveQuoteMultiHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

/**
 * Returns the index of the currently executing hop (0 or 1).
 * A hop is considered "current" if it's in an active state (awaiting user action or executing)
 */
export const useCurrentHopIndex: () => SupportedTradeQuoteStepIndex = () => {
  const activeQuote = useAppSelector(selectActiveQuote)
  const isMultiHop = useAppSelector(selectIsActiveQuoteMultiHop)

  const firstHopMetadata = useSelectorWithArgs(selectHopExecutionMetadata, {
    tradeId: activeQuote?.id ?? '',
    hopIndex: 0,
  })

  return isMultiHop && firstHopMetadata.state === HopExecutionState.Complete ? 1 : 0
}
