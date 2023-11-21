import { Card, CardBody, CardHeader, Heading, useDisclosure, usePrevious } from '@chakra-ui/react'
import { memo, useCallback, useEffect } from 'react'
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
      previousTradeExecutionState === MultiHopExecutionState.Hop1AwaitingTradeExecution
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

  return (
    <SlideTransition>
      <Card flex={1} borderRadius={cardBorderRadius} width='full' padding={6}>
        <CardHeader px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Heading textAlign='center'>
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
        {tradeExecutionState === MultiHopExecutionState.TradeComplete ? (
          <TradeSuccess handleBack={handleBack}>
            <Hops isFirstHopOpen isSecondHopOpen />
          </TradeSuccess>
        ) : (
          <>
            <CardBody pb={0} px={0}>
              <Hops
                isFirstHopOpen={isFirstHopOpen}
                isSecondHopOpen={isSecondHopOpen}
                onToggleFirstHop={onToggleFirstHop}
                onToggleSecondHop={onToggleSecondHop}
              />
            </CardBody>
            <Footer />
          </>
        )}
      </Card>
    </SlideTransition>
  )
})
