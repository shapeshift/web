import { useCallback, useMemo } from 'react'
import { assertUnreachable } from 'lib/utils'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from 'state/store'

import { getHopExecutionStateButtonTranslation } from '../helpers'
import { useCurrentHopIndex } from './useCurrentHopIndex'

type TradeButtonProps = {
  handleSubmit: () => void
  buttonText: string
  isLoading: boolean
  isDisabled: boolean
}

// TODO: This should return an object with button action, text, loading, and disabled
export const useTradeButtonProps = (): TradeButtonProps | undefined => {
  const dispatch = useAppDispatch()
  const activeQuote = useAppSelector(selectActiveQuote)
  const activeTradeId = useAppSelector(selectActiveQuote)?.id
  const currentHopIndex = useCurrentHopIndex()
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
  const { state: hopExecutionState } = useSelectorWithArgs(
    selectHopExecutionMetadata,
    hopExecutionMetadataFilter,
  )

  const handleTradeConfirmSubmit = useCallback(() => {
    // if (isModeratePriceImpact) {
    //   setShouldShowWarningAcknowledgement(true)
    // } else {
    //   handleTradeConfirm()
    // }
    handleTradeConfirm()
  }, [handleTradeConfirm])

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
          handleSubmit: () => {},
          buttonText,
          isLoading: false,
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
          handleSubmit: () => {},
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
