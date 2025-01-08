import type { SupportedTradeQuoteStepIndex, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { assertUnreachable } from 'lib/utils'
import {
  selectActiveQuote,
  selectConfirmedTradeExecutionState,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import {
  HopExecutionState,
  TradeExecutionState,
  TransactionExecutionState,
} from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from 'state/store'

import { useTradeExecution } from '../../MultiHopTradeConfirm/hooks/useTradeExecution'
import { getHopExecutionStateButtonTranslation } from '../helpers'
import { useActiveTradeAllowance } from './useActiveTradeAllowance'

type UseTradeButtonPropsProps = {
  tradeQuoteStep: TradeQuoteStep
  currentHopIndex: SupportedTradeQuoteStepIndex
  activeTradeId: string
  isExactAllowance: boolean
}

type TradeButtonProps = {
  onSubmit: () => void
  buttonText: string
  isLoading: boolean
  isDisabled: boolean
}

export const useTradeButtonProps = ({
  tradeQuoteStep,
  currentHopIndex,
  activeTradeId,
  isExactAllowance,
}: UseTradeButtonPropsProps): TradeButtonProps | undefined => {
  const dispatch = useAppDispatch()
  const history = useHistory()
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const activeQuote = useAppSelector(selectActiveQuote)
  const { isFetching, data: tradeQuoteQueryData } = useGetTradeQuotes()
  const {
    handleSignAllowanceApproval,
    isAllowanceApprovalLoading,
    isAllowanceApprovalPending,
    handleSignAllowanceReset,
    isAllowanceResetLoading,
    isAllowanceResetPending,
    signPermit2,
  } = useActiveTradeAllowance({
    tradeQuoteStep,
    isExactAllowance,
    activeTradeId,
  })
  const handleTradeConfirm = useCallback(() => {
    if (!activeQuote) return
    dispatch(tradeQuoteSlice.actions.confirmTrade(activeQuote.id))
  }, [dispatch, activeQuote])

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId ?? '',
      hopIndex: currentHopIndex ?? 0,
    }
  }, [activeTradeId, currentHopIndex])
  const {
    state: hopExecutionState,
    swap: { state: swapTxState },
  } = useSelectorWithArgs(selectHopExecutionMetadata, hopExecutionMetadataFilter)

  const executeTrade = useTradeExecution(currentHopIndex, activeTradeId)
  const handleSignTx = useCallback(() => {
    if (swapTxState !== TransactionExecutionState.AwaitingConfirmation) {
      console.error('attempted to execute in-progress swap')
      return
    }

    executeTrade()
  }, [executeTrade, swapTxState])

  const handleBack = useCallback(() => {
    if (confirmedTradeExecutionState === TradeExecutionState.TradeComplete) {
      dispatch(tradeQuoteSlice.actions.clear())
    }

    history.push(TradeRoutePaths.Input)
  }, [dispatch, history, confirmedTradeExecutionState])

  const buttonText = getHopExecutionStateButtonTranslation(hopExecutionState)

  switch (hopExecutionState) {
    case HopExecutionState.Pending:
      return {
        onSubmit: handleTradeConfirm,
        buttonText,
        isLoading: false, // Instant
        isDisabled: false, // TODO: validate balance etc
      }
    case HopExecutionState.AwaitingAllowanceReset:
      return {
        onSubmit: handleSignAllowanceReset,
        buttonText,
        isLoading: isAllowanceResetPending,
        isDisabled: isAllowanceResetLoading,
      }
    case HopExecutionState.AwaitingAllowanceApproval:
      return {
        onSubmit: handleSignAllowanceApproval,
        buttonText,
        isLoading: isAllowanceApprovalPending,
        isDisabled: isAllowanceApprovalLoading,
      }
    case HopExecutionState.AwaitingPermit2Allowance:
      return {
        onSubmit: signPermit2,
        buttonText,
        isLoading: false, // Instant
        isDisabled: false,
      }
    case HopExecutionState.AwaitingSwap:
      return {
        onSubmit: handleSignTx,
        buttonText,
        isLoading: isFetching,
        isDisabled: !tradeQuoteQueryData,
      }
    case HopExecutionState.Complete:
      return {
        onSubmit: handleBack,
        buttonText,
        isLoading: false,
        isDisabled: false,
      }
    default:
      assertUnreachable(hopExecutionState)
  }
}
