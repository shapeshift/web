import { useCallback, useEffect, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import type { TextPropTypes } from 'components/Text/Text'
import {
  selectActiveQuote,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useIsApprovalInitiallyNeeded } from '../MultiHopTradeConfirm/hooks/useIsApprovalInitiallyNeeded'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { TradeConfirmBody } from './TradeConfirmBody'
import { TradeConfirmFooter } from './TradeConfirmFooter'

export const TradeConfirm = () => {
  const { isLoading } = useIsApprovalInitiallyNeeded()
  const history = useHistory()
  const dispatch = useAppDispatch()
  const activeQuote = useAppSelector(selectActiveQuote)
  const activeTradeId = activeQuote?.id
  const currentHopIndex = useCurrentHopIndex()
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  const tradeQuoteStep = useMemo(() => {
    return currentHopIndex === 0 ? tradeQuoteFirstHop : tradeQuoteLastHop
  }, [currentHopIndex, tradeQuoteFirstHop, tradeQuoteLastHop])

  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)

  const isTradeComplete = useMemo(
    () => confirmedTradeExecutionState === TradeExecutionState.TradeComplete,
    [confirmedTradeExecutionState],
  )

  const handleBack = useCallback(() => {
    if (isTradeComplete) {
      dispatch(tradeQuoteSlice.actions.clear())
    }

    history.push(TradeRoutePaths.Input)
  }, [dispatch, history, isTradeComplete])

  const headerTranslation: TextPropTypes['translation'] | undefined = useMemo(() => {
    if (!confirmedTradeExecutionState) return undefined
    return [TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
      confirmedTradeExecutionState,
    )
      ? 'trade.confirmDetails'
      : 'trade.trade'
  }, [confirmedTradeExecutionState])

  useEffect(() => {
    if (isLoading || !activeQuote) return
    // Only set the trade to initialized if it was actually initializing previously. Now that we shove quotes in at confirm time, we can't rely on this effect only running once.
    if (confirmedTradeExecutionState !== TradeExecutionState.Initializing) return

    dispatch(tradeQuoteSlice.actions.setTradeInitialized(activeQuote.id))
  }, [dispatch, isLoading, activeQuote, confirmedTradeExecutionState])

  const footer = useMemo(() => {
    if (!tradeQuoteStep || !activeTradeId) return null
    return <TradeConfirmFooter tradeQuoteStep={tradeQuoteStep} activeTradeId={activeTradeId} />
  }, [tradeQuoteStep, activeTradeId])
  const body = useMemo(() => <TradeConfirmBody />, [])

  if (!headerTranslation || !footer) return null

  // TODO: Add WarningAcknowledgement (might need to be inside TradeSlideTransition in the SharedConfirm child below)
  return (
    <SharedConfirm
      bodyContent={body}
      footerContent={footer}
      isLoading={isLoading}
      onBack={handleBack}
      headerTranslation={headerTranslation}
    />
  )
}
