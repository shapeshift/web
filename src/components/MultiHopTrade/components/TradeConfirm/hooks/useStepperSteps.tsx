import { useMemo } from 'react'
import { selectIsActiveQuoteMultiHop } from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import {
  countStepperSteps,
  getCurrentStepperStep,
  getCurrentStepperStepIndex,
  getStepperSteps,
} from '../helpers'
import { useCurrentHopIndex } from './useCurrentHopIndex'

export const useStepperSteps = () => {
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
    permit2: firstHopPermit2Eip712,
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
      firstHopPermit2Eip712,
      firstHopAllowanceReset,
      lastHopAllowanceApproval,
      lastHopPermit2,
      lastHopAllowanceReset,
      isMultiHopTrade,
    }),
    [
      firstHopAllowanceApproval,
      firstHopPermit2Eip712,
      firstHopAllowanceReset,
      lastHopAllowanceApproval,
      lastHopPermit2,
      lastHopAllowanceReset,
      isMultiHopTrade,
    ],
  )

  const tradeSteps = useMemo(() => getStepperSteps(params), [params])
  const totalSteps = useMemo(() => countStepperSteps(params), [params])
  const currentHopIndex = useCurrentHopIndex()
  const currentHopExecutionState = useMemo(() => {
    return currentHopIndex === 0 ? firstHopExecutionState : lastHopExecutionState
  }, [currentHopIndex, firstHopExecutionState, lastHopExecutionState])
  const currentTradeStep = useMemo(
    () => getCurrentStepperStep(currentHopIndex, currentHopExecutionState),
    [currentHopIndex, currentHopExecutionState],
  )
  const currentTradeStepIndex = useMemo(
    () =>
      getCurrentStepperStepIndex({
        ...params,
        currentHopIndex,
        hopExecutionState: currentHopExecutionState,
      }),
    [params, currentHopIndex, currentHopExecutionState],
  )

  return {
    totalSteps,
    currentTradeStepIndex,
    tradeSteps,
    currentTradeStep,
  }
}
