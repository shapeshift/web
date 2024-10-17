import { Card, CardBody, CardHeader, Heading, useDisclosure, usePrevious } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectActiveQuote,
  selectConfirmedTradeExecutionState,
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

  const { isLoading } = useIsApprovalInitiallyNeeded()

  useEffect(() => {
    if (isLoading || !activeQuote) return

    dispatch(tradeQuoteSlice.actions.setTradeInitialized(activeQuote.id))
  }, [dispatch, isLoading, activeQuote])

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
      if (isFirstHopOpen) onToggleFirstHop()
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
        {isTradeComplete ? (
          <TradeSuccess handleBack={handleBack}>
            <Hops isFirstHopOpen isSecondHopOpen />
          </TradeSuccess>
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
            <Footer isLoading={isLoading} handleSubmit={handleSubmit} />
          </>
        )}
      </Card>
    </TradeSlideTransition>
  )
})
