import { Card, CardBody, useDisclosure, usePrevious } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
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
import { FooterWrapper } from './FooterWrapper'
import { useIsApprovalInitiallyNeeded } from './hooks/useIsApprovalInitiallyNeeded'

const cardBorderRadius = { base: 'xl' }
const useDisclosureProps = {
  defaultIsOpen: true,
}

export const MultiHopTradeConfirm = memo(() => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
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

  const { isOpen: isFirstHopOpen, onToggle: onToggleFirstHop } = useDisclosure(useDisclosureProps)
  const { isOpen: isSecondHopOpen, onToggle: onToggleSecondHop } = useDisclosure(useDisclosureProps)

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
          shouldShowWarningAcknowledgement={shouldShowWarningAcknowledgement}
          setShouldShowWarningAcknowledgement={setShouldShowWarningAcknowledgement}
        >
          <PageHeader>
            <PageHeader.Left>
              <PageBackButton onBack={handleBack} />
            </PageHeader.Left>
            <PageHeader.Middle>
              <PageHeader.Title>
                {translate(
                  [TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
                    tradeExecutionState,
                  )
                    ? 'trade.confirmDetails'
                    : 'trade.trade',
                )}
              </PageHeader.Title>
            </PageHeader.Middle>
          </PageHeader>
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
              <FooterWrapper>
                <Footer handleSubmit={handleSubmit} />
              </FooterWrapper>
            </>
          )}
        </WarningAcknowledgement>
      </Card>
    </TradeSlideTransition>
  )
})
