import { Stepper, usePrevious } from '@chakra-ui/react'
import { isArbitrumBridgeTradeQuoteOrRate } from '@shapeshiftoss/swapper'
import { useCallback, useEffect, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useTrackTradeQuotes } from '../../hooks/useGetTradeQuotes/hooks/useTrackTradeQuotes'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { SpotTradeSuccess } from '../SpotTradeSuccess/SpotTradeSuccess'
import { ExpandableStepperSteps } from './components/ExpandableStepperSteps'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { useIsApprovalInitiallyNeeded } from './hooks/useIsApprovalInitiallyNeeded'
import { TradeConfirmBody } from './TradeConfirmBody'
import { TradeConfirmFooter } from './TradeConfirmFooter'

import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import type { TextPropTypes } from '@/components/Text/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { fromBaseUnit } from '@/lib/math'
import {
  selectActiveQuote,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectLastHop,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const TradeConfirm = ({ isCompact }: { isCompact: boolean | undefined }) => {
  const navigate = useNavigate()
  const { isLoading } = useIsApprovalInitiallyNeeded()
  const dispatch = useAppDispatch()
  const {
    state: { isConnected },
  } = useWallet()
  const activeQuote = useAppSelector(selectActiveQuote)
  const activeTradeId = activeQuote?.id
  const currentHopIndex = useCurrentHopIndex()
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  useTrackTradeQuotes()
  const tradeQuoteStep = useMemo(() => {
    return currentHopIndex === 0 ? tradeQuoteFirstHop : tradeQuoteLastHop
  }, [currentHopIndex, tradeQuoteFirstHop, tradeQuoteLastHop])

  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const prevIsConnected = usePrevious(isConnected)

  const isTradeComplete = useMemo(
    () => confirmedTradeExecutionState === TradeExecutionState.TradeComplete,
    [confirmedTradeExecutionState],
  )

  const handleBack = useCallback(() => {
    if (isTradeComplete) {
      dispatch(tradeQuoteSlice.actions.clear())
    }

    navigate(TradeRoutePaths.Input)
  }, [dispatch, navigate, isTradeComplete])

  useEffect(() => {
    if (prevIsConnected && !isConnected) {
      handleBack()
    }
  }, [isConnected, prevIsConnected, handleBack])

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
    if (isTradeComplete && activeQuote && tradeQuoteLastHop) return null
    if (!tradeQuoteStep || !activeTradeId) return null
    return (
      <TradeConfirmFooter
        isCompact={isCompact}
        tradeQuoteStep={tradeQuoteStep}
        activeTradeId={activeTradeId}
      />
    )
  }, [isTradeComplete, activeQuote, tradeQuoteLastHop, tradeQuoteStep, activeTradeId, isCompact])

  const isArbitrumBridgeWithdraw = useMemo(() => {
    return isArbitrumBridgeTradeQuoteOrRate(activeQuote) && activeQuote.direction === 'withdrawal'
  }, [activeQuote])

  const body = useMemo(() => {
    if (isTradeComplete && activeQuote && tradeQuoteLastHop)
      return (
        <SpotTradeSuccess
          handleBack={handleBack}
          titleTranslation={
            isArbitrumBridgeWithdraw
              ? 'bridge.arbitrum.success.tradeSuccess'
              : 'trade.temp.tradeSuccess'
          }
          buttonTranslation='trade.doAnotherTrade'
          summaryTranslation='trade.summary'
          sellAsset={activeQuote?.steps[0].sellAsset}
          buyAsset={tradeQuoteLastHop.buyAsset}
          sellAmountCryptoPrecision={fromBaseUnit(
            activeQuote.steps[0].sellAmountIncludingProtocolFeesCryptoBaseUnit,
            activeQuote.steps[0].sellAsset.precision,
          )}
          quoteBuyAmountCryptoPrecision={fromBaseUnit(
            tradeQuoteLastHop.buyAmountAfterFeesCryptoBaseUnit,
            tradeQuoteLastHop.buyAsset.precision,
          )}
        >
          <Stepper index={-1} orientation='vertical' gap='0' my={6}>
            <ExpandableStepperSteps isExpanded />
          </Stepper>
        </SpotTradeSuccess>
      )

    return <TradeConfirmBody />
  }, [activeQuote, handleBack, isArbitrumBridgeWithdraw, isTradeComplete, tradeQuoteLastHop])

  // We should have some execution state here... unless we're rehydrating or trying to access /trade/confirm directly
  if (!confirmedTradeExecutionState) return <Navigate to={TradeRoutePaths.Input} replace />
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
