import { Card, CardBody, CardHeader, Heading, useDisclosure, usePrevious } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useHistory } from 'react-router-dom'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { swappers as swappersSlice } from 'state/slices/swappersSlice/swappersSlice'
import { selectTradeExecutionState } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { MultiHopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TradeSuccess } from '../TradeSuccess/TradeSuccess'
import { Footer } from './components/Footer'
import { Hops } from './components/Hops'
import { useIsApprovalInitiallyNeeded } from './hooks/useIsApprovalInitiallyNeeded'

const cardBorderRadius = { base: 'xl' }

export const MultiHopTradeConfirm = memo(() => {
  const dispatch = useAppDispatch()
  const tradeExecutionState = useAppSelector(selectTradeExecutionState)
  const previousTradeExecutionState = usePrevious(tradeExecutionState)
  const history = useHistory()

  const { isApprovalInitiallyNeeded, isLoading } = useIsApprovalInitiallyNeeded()

  // NOTE: we use dom manipulation to move the component around without losing the component
  // internal state. If we decide this approach isn't suitable we'll need to rewrite the trade
  // execution hooks and components to store state and metadata inside redux
  const containerRef = useRef<HTMLDivElement>(null)
  const tradeCompleteSummaryRef = useRef<HTMLDivElement>(null)
  const tradeExecutionRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const currentTargetRef =
      tradeExecutionState === MultiHopExecutionState.TradeComplete
        ? tradeCompleteSummaryRef
        : tradeExecutionRef

    if (containerRef.current && currentTargetRef.current) {
      currentTargetRef.current.appendChild(containerRef.current)
    }
  }, [tradeExecutionState]) // Rerun when tradeExecutionState changes

  // set initial approval requirements
  useEffect(() => {
    if (isLoading) return
    dispatch(tradeQuoteSlice.actions.setInitialApprovalRequirements(isApprovalInitiallyNeeded))
  }, [dispatch, isApprovalInitiallyNeeded, isLoading])

  const handleBack = useCallback(() => {
    dispatch(swappersSlice.actions.clear())
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
      previousTradeExecutionState === MultiHopExecutionState.FirstHopAwaitingTradeExecution
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
    () => tradeExecutionState === MultiHopExecutionState.TradeComplete,
    [tradeExecutionState],
  )

  return (
    <>
      <SlideTransition>
        <Card flex={1} borderRadius={cardBorderRadius} width='full' variant='dashboard'>
          <CardHeader px={6} pt={4}>
            <WithBackButton handleBack={handleBack}>
              <Heading textAlign='center' fontSize='md'>
                <Text
                  translation={
                    tradeExecutionState === MultiHopExecutionState.Previewing
                      ? 'trade.confirmDetails'
                      : 'trade.trade'
                  }
                />
              </Heading>
            </WithBackButton>
          </CardHeader>
          {isTradeComplete ? (
            <TradeSuccess handleBack={handleBack}>
              <div ref={tradeCompleteSummaryRef} />
            </TradeSuccess>
          ) : (
            <>
              <CardBody py={0} px={0}>
                <div ref={tradeExecutionRef} />
              </CardBody>
              <Footer />
            </>
          )}
        </Card>
      </SlideTransition>
      <div ref={containerRef}>
        <Hops
          isFirstHopOpen={isTradeComplete || isFirstHopOpen}
          isSecondHopOpen={isTradeComplete || isSecondHopOpen}
          onToggleFirstHop={isTradeComplete ? undefined : onToggleFirstHop}
          onToggleSecondHop={isTradeComplete ? undefined : onToggleSecondHop}
        />
      </div>
    </>
  )
})
