import { Card, CardBody, CardHeader, Heading, useDisclosure, usePrevious } from '@chakra-ui/react'
import { isArbitrumBridgeTradeQuoteOrRate } from '@shapeshiftoss/swapper/dist/swappers/ArbitrumBridgeSwapper/getTradeQuote/getTradeQuote'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { WarningAcknowledgement } from 'components/Acknowledgement/WarningAcknowledgement'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  selectActiveQuote,
  selectConfirmedTradeExecutionState,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TradeSuccess } from '../TradeSuccess/TradeSuccess'
import { Footer } from './components/Footer'
import { Hops } from './components/Hops'
import { useIsApprovalInitiallyNeeded } from './hooks/useIsApprovalInitiallyNeeded'

const cardBorderRadius = { base: 'xl' }
const useDisclosureProps = {
  defaultIsOpen: true,
}

export const MultiHopTradeConfirm = memo(() => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const previousTradeExecutionState = usePrevious(confirmedTradeExecutionState)
  const history = useHistory()

  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const activeQuote = useAppSelector(selectActiveQuote)
  const { isModeratePriceImpact, priceImpactPercentage } = usePriceImpact(activeQuote)
  const lastHop = useAppSelector(selectLastHop)

  const initialActiveTradeIdRef = useRef(activeQuote?.id ?? '')

  const { isLoading } = useIsApprovalInitiallyNeeded()

  const isArbitrumBridgeWithdraw = useMemo(() => {
    return isArbitrumBridgeTradeQuoteOrRate(activeQuote) && activeQuote.direction === 'withdrawal'
  }, [activeQuote])

  useEffect(() => {
    if (isLoading || !activeQuote) return
    // Only set the trade to initialized if it was actually initializing previously. Now that we shove quotes in at confirm time, we can't rely on this effect only running once.
    if (confirmedTradeExecutionState !== TradeExecutionState.Initializing) return

    dispatch(tradeQuoteSlice.actions.setTradeInitialized(activeQuote.id))
  }, [dispatch, isLoading, activeQuote, confirmedTradeExecutionState])

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

  const { isOpen: isFirstHopOpen, onToggle: onToggleFirstHop } = useDisclosure(useDisclosureProps)
  const { isOpen: isSecondHopOpen, onToggle: onToggleSecondHop } = useDisclosure(useDisclosureProps)

  // toggle hop open states as we transition to the next hop
  useEffect(() => {
    if (
      previousTradeExecutionState !== confirmedTradeExecutionState &&
      previousTradeExecutionState === TradeExecutionState.FirstHop
    ) {
      if (!isFirstHopOpen) onToggleFirstHop()
      if (!isSecondHopOpen) onToggleSecondHop()
    }
  }, [
    isFirstHopOpen,
    isSecondHopOpen,
    onToggleFirstHop,
    onToggleSecondHop,
    previousTradeExecutionState,
    confirmedTradeExecutionState,
  ])

  const handleTradeConfirm = useCallback(() => {
    if (!activeQuote) return
    dispatch(tradeQuoteSlice.actions.confirmTrade(activeQuote.id))
  }, [dispatch, activeQuote])

  const handleSubmit = useCallback(() => {
    if (isModeratePriceImpact) {
      setShouldShowWarningAcknowledgement(true)
    } else {
      handleTradeConfirm()
    }
  }, [handleTradeConfirm, isModeratePriceImpact])

  if (!confirmedTradeExecutionState) return null

  return (
    <TradeSlideTransition>
      <Card
        flex={1}
        borderRadius={cardBorderRadius}
        width='full'
        variant='dashboard'
        maxWidth='500px'
      >
        <WarningAcknowledgement
          message={translate('warningAcknowledgement.highSlippageTrade', {
            slippagePercentage: bnOrZero(priceImpactPercentage).toFixed(2).toString(),
          })}
          onAcknowledge={handleTradeConfirm}
          shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
          setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
        />
        <CardHeader px={6} pt={4}>
          <WithBackButton onBack={handleBack}>
            <Heading textAlign='center' fontSize='md'>
              <Text
                translation={
                  [TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
                    confirmedTradeExecutionState,
                  )
                    ? 'trade.confirmDetails'
                    : 'trade.trade'
                }
              />
            </Heading>
          </WithBackButton>
        </CardHeader>
        {isTradeComplete && activeQuote && lastHop ? (
          <TradeSuccess
            handleBack={handleBack}
            titleTranslation={
              isArbitrumBridgeWithdraw
                ? 'bridge.arbitrum.success.tradeSuccess'
                : 'trade.temp.tradeSuccess'
            }
            buttonTranslation='trade.doAnotherTrade'
            summaryTranslation='trade.summary'
            sellAsset={activeQuote?.steps[0].sellAsset}
            buyAsset={lastHop.buyAsset}
            sellAmountCryptoPrecision={fromBaseUnit(
              activeQuote.steps[0].sellAmountIncludingProtocolFeesCryptoBaseUnit,
              activeQuote.steps[0].sellAsset.precision,
            )}
            buyAmountCryptoPrecision={fromBaseUnit(
              lastHop.buyAmountAfterFeesCryptoBaseUnit,
              lastHop.buyAsset.precision,
            )}
          >
            <Hops
              initialActiveTradeId={initialActiveTradeIdRef.current}
              isFirstHopOpen
              isSecondHopOpen
            />
          </TradeSuccess>
        ) : (
          <>
            <CardBody py={0} px={0}>
              <Hops
                initialActiveTradeId={initialActiveTradeIdRef.current}
                isFirstHopOpen={isFirstHopOpen}
                isSecondHopOpen={isSecondHopOpen}
                onToggleFirstHop={onToggleFirstHop}
                onToggleSecondHop={onToggleSecondHop}
              />
            </CardBody>
            <Footer isLoading={isLoading} handleSubmit={handleSubmit} />
          </>
        )}
      </Card>
    </TradeSlideTransition>
  )
})
