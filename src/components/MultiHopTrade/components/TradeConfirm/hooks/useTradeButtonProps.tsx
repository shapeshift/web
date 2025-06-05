import type { SupportedTradeQuoteStepIndex, Swap, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapStatus } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'

import { getHopExecutionStateButtonTranslation } from '../helpers'
import { useActiveTradeAllowance } from './useActiveTradeAllowance'
import { useTradeExecution } from './useTradeExecution'

import { useGetTradeQuotes } from '@/components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { assertUnreachable } from '@/lib/utils'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { selectFirstHopSellAccountId } from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectConfirmedTradeExecutionState,
  selectHopExecutionMetadata,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import {
  HopExecutionState,
  TradeExecutionState,
  TransactionExecutionState,
} from '@/state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from '@/state/store'

type UseTradeButtonPropsProps = {
  tradeQuoteStep: TradeQuoteStep
  currentHopIndex: SupportedTradeQuoteStepIndex
  activeTradeId: string
  isExactAllowance: boolean
}

type TradeButtonProps = {
  onSubmit: (() => void) | (() => Promise<void>)
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
  const navigate = useNavigate()
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

  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)

  const handleTradeConfirm = useCallback(() => {
    if (!activeQuote) return

    const firstStep = activeQuote.steps[0]
    const lastStep = activeQuote.steps[activeQuote.steps.length - 1]
    const swap: Swap = {
      id: uuid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sellAccountId,
      swapperName: activeQuote.swapperName,
      sellAsset: firstStep.sellAsset,
      buyAsset: lastStep.buyAsset,
      sellAmountCryptoBaseUnit: firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: lastStep.buyAmountAfterFeesCryptoBaseUnit,
      metadata: {
        lifiRoute: firstStep?.lifiSpecific?.lifiRoute,
        lifiTools: firstStep?.lifiSpecific?.lifiTools,
        chainflipSwapId: firstStep?.chainflipSpecific?.chainflipSwapId,
        stepIndex: currentHopIndex,
        relayTransactionMetadata: firstStep?.relayTransactionMetadata,
      },
      status: SwapStatus.Idle,
    }

    dispatch(swapSlice.actions.upsertSwap(swap))
    dispatch(swapSlice.actions.setActiveSwapId(swap.id))

    dispatch(tradeQuoteSlice.actions.confirmTrade(activeQuote.id))
  }, [dispatch, activeQuote, currentHopIndex, sellAccountId])

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId ?? '',
      hopIndex: currentHopIndex ?? 0,
    }
  }, [activeTradeId, currentHopIndex])
  const {
    allowanceApproval,
    allowanceReset,
    state: hopExecutionState,
    swap: { state: swapTxState },
  } = useSelectorWithArgs(selectHopExecutionMetadata, hopExecutionMetadataFilter)

  const executeTrade = useTradeExecution(currentHopIndex, activeTradeId)
  const handleSignTx = useCallback(() => {
    if (
      ![TransactionExecutionState.AwaitingConfirmation, TransactionExecutionState.Failed].includes(
        swapTxState,
      )
    ) {
      console.error('attempted to execute in-progress swap')
      return
    }

    return executeTrade()
  }, [executeTrade, swapTxState])

  const handleBack = useCallback(() => {
    if (confirmedTradeExecutionState === TradeExecutionState.TradeComplete) {
      dispatch(tradeQuoteSlice.actions.clear())
    }

    navigate(TradeRoutePaths.Input)
  }, [dispatch, navigate, confirmedTradeExecutionState])

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
        isLoading:
          isAllowanceResetLoading ||
          isAllowanceResetPending ||
          // If the allowance approval is complete but we're still at allowance approval stage, assume we're pending
          // That's as good as we can do heuristics-wise, and if user decided to manually change the allowance to a lower one in their wallet before submitting the Tx for any reason,
          // then that will be an infinite load
          allowanceReset.state === TransactionExecutionState.Complete,
        isDisabled: isAllowanceResetLoading,
      }
    case HopExecutionState.AwaitingAllowanceApproval:
      return {
        onSubmit: handleSignAllowanceApproval,
        buttonText,
        isLoading:
          isAllowanceApprovalLoading ||
          isAllowanceApprovalPending ||
          // If the allowance approval is complete but we're still at allowance approval stage, assume we're pending
          // That's as good as we can do heuristics-wise, and if user decided to manually change the allowance to a lower one in their wallet before submitting the Tx for any reason,
          // then that will be an infinite load
          allowanceApproval.state === TransactionExecutionState.Complete,
        isDisabled: isAllowanceApprovalLoading,
      }
    case HopExecutionState.AwaitingPermit2Eip712Sign:
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
