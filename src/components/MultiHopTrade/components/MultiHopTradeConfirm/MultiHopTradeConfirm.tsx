import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  Stack,
  useDisclosure,
  usePrevious,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { swappers as swappersSlice } from 'state/slices/swappersSlice/swappersSlice'
import {
  selectActiveSwapperName,
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
  selectTradeExecutionState,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { MultiHopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import { Footer } from './components/Footer'
import { Hop } from './components/Hop'
import { useIsApprovalInitiallyNeeded } from './hooks/useIsApprovalInitiallyNeeded'

const cardBorderRadius = { base: 'xl' }

export const MultiHopTradeConfirm = memo(() => {
  const dispatch = useAppDispatch()
  const swapperName = useAppSelector(selectActiveSwapperName)
  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const tradeExecutionState = useAppSelector(selectTradeExecutionState)
  const previousTradeExecutionState = usePrevious(tradeExecutionState)
  const history = useHistory()

  const { isOpen: isFirstHopOpen, onToggle: onToggleFirstHop } = useDisclosure({
    defaultIsOpen: true,
  })

  const { isOpen: isSecondHopOpen, onToggle: onToggleSecondHop } = useDisclosure({
    defaultIsOpen: true,
  })

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

  // TODO: redirect to completed page when trade is complete
  // useEffect(() => {
  //   if (
  //     previousTradeExecutionState !== tradeExecutionState &&
  //     tradeExecutionState === MultiHopExecutionState.TradeComplete
  //   ) {
  //     history.push(TradeRoutePaths.Complete)
  //   }
  // }, [history, previousTradeExecutionState, tradeExecutionState])

  if (!firstHop || !swapperName) return null

  return (
    <SlideTransition>
      <Card flex={1} borderRadius={cardBorderRadius} width='full' padding={6}>
        <CardHeader px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Heading textAlign='center'>
              <Text translation='trade.confirmDetails' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <CardBody pb={0} px={0}>
          <Stack spacing={6}>
            <Hop
              tradeQuoteStep={firstHop}
              swapperName={swapperName}
              hopIndex={0}
              isOpen={isFirstHopOpen}
              onToggleIsOpen={onToggleFirstHop}
            />
            {isMultiHopTrade && lastHop && (
              <Hop
                tradeQuoteStep={lastHop}
                swapperName={swapperName}
                hopIndex={1}
                isOpen={isSecondHopOpen}
                onToggleIsOpen={onToggleSecondHop}
              />
            )}
          </Stack>
        </CardBody>
      </Card>
      <Footer />
    </SlideTransition>
  )
})
