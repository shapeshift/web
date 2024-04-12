import { Card, CardBody, CardHeader, Heading, useDisclosure, usePrevious } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Text } from 'components/Text'
import { WarningAcknowledgement } from 'components/WarningAcknowledgement/WarningAcknowledgement'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectActiveQuote,
  selectTradeExecutionState,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TradeSuccessTemp } from '../TradeSuccess/TradeSuccessTemp'
import { Footer } from './components/Footer'
import { Hops } from './components/Hops'
import { useIsApprovalInitiallyNeeded } from './hooks/useIsApprovalInitiallyNeeded'

const cardBorderRadius = { base: 'xl' }

export const MultiHopTradeConfirm = memo(() => {
  const dispatch = useAppDispatch()
  const tradeExecutionState = useAppSelector(selectTradeExecutionState)
  const previousTradeExecutionState = usePrevious(tradeExecutionState)
  const history = useHistory()

  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const activeQuote = useAppSelector(selectActiveQuote)
  const { isModeratePriceImpact, priceImpactPercentage } = usePriceImpact(activeQuote)

  const { isLoading } = useIsApprovalInitiallyNeeded()

  useEffect(() => {
    if (isLoading) return

    dispatch(tradeQuoteSlice.actions.setTradeInitialized())
  }, [dispatch, isLoading])

  const handleBack = useCallback(() => {
    dispatch(tradeQuoteSlice.actions.clear())
    history.push(TradeRoutePaths.Input)
  }, [dispatch, history])

  const { isOpen: isFirstHopOpen, onToggle: onToggleFirstHop } = useDisclosure({
    defaultIsOpen: true,
  })

  const { isOpen: isSecondHopOpen, onToggle: onToggleSecondHop } = useDisclosure({
    defaultIsOpen: true,
  })

  // toggle hop open states as we transition to the next hop
  useEffect(() => {
    if (
      previousTradeExecutionState !== tradeExecutionState &&
      previousTradeExecutionState === TradeExecutionState.FirstHop
    ) {
      if (isFirstHopOpen) onToggleFirstHop()
      if (!isSecondHopOpen) onToggleSecondHop()
    }
  }, [
    isFirstHopOpen,
    isSecondHopOpen,
    onToggleFirstHop,
    onToggleSecondHop,
    previousTradeExecutionState,
    tradeExecutionState,
  ])

  const isTradeComplete = useMemo(
    () => tradeExecutionState === TradeExecutionState.TradeComplete,
    [tradeExecutionState],
  )

  const handleTradeConfirm = useCallback(() => {
    dispatch(tradeQuoteSlice.actions.confirmTrade())
  }, [dispatch])

  const handleSubmit = useCallback(() => {
    if (isModeratePriceImpact) {
      setShouldShowWarningAcknowledgement(true)
    } else {
      handleTradeConfirm()
    }
  }, [handleTradeConfirm, isModeratePriceImpact])

  return (
    <TradeSlideTransition>
      <WarningAcknowledgement
        message={`This trade is impacted by price movement (${bnOrZero(priceImpactPercentage)
          .toFixed(2)
          .toString()}%). Proceed with caution.`}
        onAcknowledge={handleTradeConfirm}
        shouldShowWarningAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowWarningAcknowledgement={setShouldShowWarningAcknowledgement}
      >
        <Card
          flex={1}
          borderRadius={cardBorderRadius}
          width='full'
          variant='dashboard'
          maxWidth='500px'
        >
          <CardHeader px={6} pt={4}>
            <WithBackButton onBack={handleBack}>
              <Heading textAlign='center' fontSize='md'>
                <Text
                  translation={
                    [TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
                      tradeExecutionState,
                    )
                      ? 'trade.confirmDetails'
                      : 'trade.trade'
                  }
                />
              </Heading>
            </WithBackButton>
          </CardHeader>
          {isTradeComplete ? (
            <TradeSuccessTemp handleBack={handleBack}>
              <Hops isFirstHopOpen isSecondHopOpen />
            </TradeSuccessTemp>
          ) : (
            <>
              <CardBody py={0} px={0}>
                <Hops
                  isFirstHopOpen={isFirstHopOpen}
                  isSecondHopOpen={isSecondHopOpen}
                  onToggleFirstHop={onToggleFirstHop}
                  onToggleSecondHop={onToggleSecondHop}
                />
              </CardBody>
              <Footer handleSubmit={handleSubmit} />
            </>
          )}
        </Card>
      </WarningAcknowledgement>
    </TradeSlideTransition>
  )
})
