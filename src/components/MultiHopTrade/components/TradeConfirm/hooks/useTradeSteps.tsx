import { useMemo } from 'react'
import { selectIsActiveQuoteMultiHop } from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { countTradeSteps, getCurrentStep, getTradeSteps } from '../helpers'

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

  const tradeSteps = useMemo(() => getTradeSteps(params), [params])
  const totalSteps = useMemo(() => countTradeSteps(params), [params])
  const currentStep = useMemo(
    () =>
      getCurrentStep({
        ...params,
        currentHopIndex:
          isMultiHopTrade && firstHopExecutionState === HopExecutionState.Complete ? 1 : 0,
        hopExecutionState:
          isMultiHopTrade && firstHopExecutionState === HopExecutionState.Complete
            ? lastHopExecutionState
            : firstHopExecutionState,
      }),
    [params, firstHopExecutionState, lastHopExecutionState, isMultiHopTrade],
  )

  return {
    totalSteps,
    currentStep,
    tradeSteps,
  }
}
