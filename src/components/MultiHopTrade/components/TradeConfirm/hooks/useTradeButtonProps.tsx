import type { SupportedTradeQuoteStepIndex, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { assertUnreachable } from 'lib/utils'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from 'state/store'

import { useTradeExecution } from '../../MultiHopTradeConfirm/hooks/useTradeExecution'
import { getHopExecutionStateButtonTranslation } from '../helpers'
import { useSignAllowanceApproval } from './useSignAllowanceApproval'

type UseTradeButtonPropsProps = {
  tradeQuoteStep: TradeQuoteStep
  currentHopIndex: SupportedTradeQuoteStepIndex
  activeTradeId: string
}

type TradeButtonProps = {
  handleSubmit: () => void
  buttonText: string
  isLoading: boolean
  isDisabled: boolean
}

export const useTradeButtonProps = ({
  tradeQuoteStep,
  currentHopIndex,
  activeTradeId,
}: UseTradeButtonPropsProps): TradeButtonProps | undefined => {
  const dispatch = useAppDispatch()
  const activeQuote = useAppSelector(selectActiveQuote)
  const { handleSignAllowanceApproval, isLoading: isAllowanceApprovalLoading } =
    useSignAllowanceApproval({
      tradeQuoteStep,
      isExactAllowance: true,
      currentHopIndex,
      activeTradeId: activeTradeId ?? '', // FIXME: handle undefined
    }) // FIXME: handle allowance selection
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

  const handleTradeConfirmSubmit = useCallback(() => {
    // if (isModeratePriceImpact) {
    //   setShouldShowWarningAcknowledgement(true)
    // } else {
    //   handleTradeConfirm()
    // }
    handleTradeConfirm()
  }, [handleTradeConfirm])

  const executeTrade = useTradeExecution(currentHopIndex, activeTradeId)
  const handleSignTx = useCallback(() => {
    if (swapTxState !== TransactionExecutionState.AwaitingConfirmation) {
      console.error('attempted to execute in-progress swap')
      return
    }

    executeTrade()
  }, [executeTrade, swapTxState])

  const buttonText = getHopExecutionStateButtonTranslation(hopExecutionState)

  return ((): TradeButtonProps | undefined => {
    switch (hopExecutionState) {
      case HopExecutionState.Pending:
        return {
          handleSubmit: handleTradeConfirmSubmit,
          buttonText,
          isLoading: false,
          isDisabled: false,
        }
      case HopExecutionState.AwaitingAllowanceReset:
        return {
          handleSubmit: () => {},
          buttonText,
          isLoading: false,
          isDisabled: false,
        }
      case HopExecutionState.AwaitingAllowanceApproval:
        return {
          handleSubmit: handleSignAllowanceApproval,
          buttonText,
          isLoading: isAllowanceApprovalLoading,
          isDisabled: false,
        }
      case HopExecutionState.AwaitingPermit2:
        return {
          handleSubmit: () => {},
          buttonText,
          isLoading: false,
          isDisabled: false,
        }
      case HopExecutionState.AwaitingSwap:
        return {
          handleSubmit: handleSignTx,
          buttonText,
          isLoading: false,
          isDisabled: false,
        }
      case HopExecutionState.Complete:
        return undefined
      default:
        assertUnreachable(hopExecutionState)
    }
  })()
}
