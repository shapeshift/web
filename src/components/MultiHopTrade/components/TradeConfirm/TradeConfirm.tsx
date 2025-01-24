import { Stepper } from '@chakra-ui/react'
import { isArbitrumBridgeTradeQuoteOrRate } from '@shapeshiftoss/swapper/dist/swappers/ArbitrumBridgeSwapper/getTradeQuote/getTradeQuote'
import { useCallback, useEffect, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import type { TextPropTypes } from 'components/Text/Text'
import { fromBaseUnit } from 'lib/math'
import {
  selectConfirmedQuote,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuote } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useIsApprovalInitiallyNeeded } from '../MultiHopTradeConfirm/hooks/useIsApprovalInitiallyNeeded'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { TradeSuccess } from '../TradeSuccess/TradeSuccess'
import { ExpandableStepperSteps } from './ExpandableStepperSteps'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { TradeConfirmBody } from './TradeConfirmBody'
import { TradeConfirmFooter } from './TradeConfirmFooter'

export const TradeConfirm = () => {
  const { isLoading } = useIsApprovalInitiallyNeeded()
  const history = useHistory()
  const dispatch = useAppDispatch()
  const confirmedQuote = useAppSelector(selectConfirmedQuote)
  const activeTradeId = confirmedQuote?.id
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
      dispatch(tradeQuote.actions.clear())
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
    if (isLoading || !confirmedQuote) return
    // Only set the trade to initialized if it was actually initializing previously. Now that we shove quotes in at confirm time, we can't rely on this effect only running once.
    if (confirmedTradeExecutionState !== TradeExecutionState.Initializing) return

    dispatch(tradeQuote.actions.setTradeInitialized(confirmedQuote.id))
  }, [dispatch, isLoading, confirmedQuote, confirmedTradeExecutionState])

  const footer = useMemo(() => {
    if (isTradeComplete && confirmedQuote && tradeQuoteLastHop) return null
    if (!tradeQuoteStep || !activeTradeId) return null
    return <TradeConfirmFooter tradeQuoteStep={tradeQuoteStep} activeTradeId={activeTradeId} />
  }, [isTradeComplete, confirmedQuote, tradeQuoteLastHop, tradeQuoteStep, activeTradeId])

  const isArbitrumBridgeWithdraw = useMemo(() => {
    return (
      isArbitrumBridgeTradeQuoteOrRate(confirmedQuote) && confirmedQuote?.direction === 'withdrawal'
    )
  }, [confirmedQuote])

  const body = useMemo(() => {
    if (isTradeComplete && confirmedQuote && tradeQuoteLastHop)
      return (
        <TradeSuccess
          handleBack={handleBack}
          titleTranslation={
            isArbitrumBridgeWithdraw ? 'bridge.arbitrum.success.tradeSuccess' : undefined
          }
          sellAsset={confirmedQuote?.steps[0].sellAsset}
          buyAsset={tradeQuoteLastHop.buyAsset}
          sellAmountCryptoPrecision={fromBaseUnit(
            confirmedQuote.steps[0].sellAmountIncludingProtocolFeesCryptoBaseUnit,
            confirmedQuote.steps[0].sellAsset.precision,
          )}
          buyAmountCryptoPrecision={fromBaseUnit(
            tradeQuoteLastHop.buyAmountAfterFeesCryptoBaseUnit,
            tradeQuoteLastHop.buyAsset.precision,
          )}
        >
          <Stepper index={-1} orientation='vertical' gap='0' my={6}>
            <ExpandableStepperSteps isExpanded />
          </Stepper>
        </TradeSuccess>
      )

    return <TradeConfirmBody />
  }, [confirmedQuote, handleBack, isArbitrumBridgeWithdraw, isTradeComplete, tradeQuoteLastHop])

  if (!headerTranslation) return null

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
