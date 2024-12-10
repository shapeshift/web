import { useMemo } from 'react'
import { selectIsActiveQuoteMultiHop } from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { countTradeSteps, getCurrentStep } from '../helpers'

export const useTradeSteps = () => {
  const activeTradeId = useAppSelector(selectActiveQuote)?.id
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)

  const firstHopExecutionMetadataFilter = useMemo(
    () => ({
      tradeId: activeTradeId ?? '',
      hopIndex: 0,
    }),
    [activeTradeId],
  )

  const {
    state: firstHopExecutionState,
    allowanceApproval: firstHopAllowanceApproval,
    permit2: firstHopPermit2,
    allowanceReset: firstHopAllowanceReset,
  } = useAppSelector(state => selectHopExecutionMetadata(state, firstHopExecutionMetadataFilter))

  const lastHopExecutionMetadataFilter = useMemo(
    () => ({
      tradeId: activeTradeId ?? '',
      hopIndex: 1,
    }),
    [activeTradeId],
  )

  const {
    state: lastHopExecutionState,
    allowanceApproval: lastHopAllowanceApproval,
    permit2: lastHopPermit2,
    allowanceReset: lastHopAllowanceReset,
  } = useAppSelector(state => selectHopExecutionMetadata(state, lastHopExecutionMetadataFilter))

  const params = useMemo(
    () => ({
      firstHopAllowanceApproval,
      firstHopPermit2,
      firstHopAllowanceReset,
      lastHopAllowanceApproval,
      lastHopPermit2,
      lastHopAllowanceReset,
      isMultiHopTrade,
    }),
    [
      firstHopAllowanceApproval,
      firstHopPermit2,
      firstHopAllowanceReset,
      lastHopAllowanceApproval,
      lastHopPermit2,
      lastHopAllowanceReset,
      isMultiHopTrade,
    ],
  )

  const totalSteps = useMemo(() => countTradeSteps(params), [params])
  const currentStep = useMemo(
    () =>
      getCurrentStep({
        ...params,
        currentHopIndex: lastHopExecutionState ? 1 : 0,
        hopExecutionState: lastHopExecutionState || firstHopExecutionState,
      }),
    [params, firstHopExecutionState, lastHopExecutionState],
  )

  return {
    totalSteps,
    currentStep,
  }
}
