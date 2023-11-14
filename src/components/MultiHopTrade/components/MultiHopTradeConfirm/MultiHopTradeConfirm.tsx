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
import { selectTradeExecutionStatus } from 'state/slices/selectors'
import { swappers as swappersSlice } from 'state/slices/swappersSlice/swappersSlice'
import { MultiHopExecutionStatus } from 'state/slices/swappersSlice/types'
import {
  selectActiveSwapperName,
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { FirstHop } from './components/FirstHop'
import { Footer } from './components/Footer'
import { SecondHop } from './components/SecondHop'

const cardBorderRadius = { base: 'xl' }

export const MultiHopTradeConfirm = memo(() => {
  const dispatch = useAppDispatch()
  const swapperName = useAppSelector(selectActiveSwapperName)
  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const tradeExecutionStatus = useAppSelector(selectTradeExecutionStatus)
  const previousTradeExecutionStatus = usePrevious(tradeExecutionStatus)
  const history = useHistory()

  const { isOpen: isFirstHopOpen, onToggle: onToggleFirstHop } = useDisclosure({
    defaultIsOpen: true,
  })

  const { isOpen: isSecondHopOpen, onToggle: onToggleSecondHop } = useDisclosure({
    defaultIsOpen: true,
  })

  const handleBack = useCallback(() => {
    dispatch(swappersSlice.actions.clear())
    history.push(TradeRoutePaths.Input)
  }, [dispatch, history])

  // toggle hop open states as we transition to the next hop
  useEffect(() => {
    if (
      previousTradeExecutionStatus !== tradeExecutionStatus &&
      tradeExecutionStatus === MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation
    ) {
      // TODO: single hop trades should redirect to completed page
      // if (!isMultiHopTrade) history.push(TradeRoutePaths.Complete)

      if (isFirstHopOpen) onToggleFirstHop()
      if (!isSecondHopOpen) onToggleSecondHop()
    }
  }, [
    isFirstHopOpen,
    isSecondHopOpen,
    onToggleFirstHop,
    onToggleSecondHop,
    previousTradeExecutionStatus,
    tradeExecutionStatus,
  ])

  // TODO: redirect to completed page when trade is complete
  // useEffect(() => {
  //   if (
  //     previousTradeExecutionStatus !== tradeExecutionStatus &&
  //     tradeExecutionStatus === MultiHopExecutionStatus.TradeComplete
  //   ) {
  //     history.push(TradeRoutePaths.Complete)
  //   }
  // }, [history, previousTradeExecutionStatus, tradeExecutionStatus])

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
            <FirstHop
              tradeQuoteStep={firstHop}
              swapperName={swapperName}
              isMultiHopTrade={!!isMultiHopTrade}
              isOpen={isFirstHopOpen}
              onToggleIsOpen={onToggleFirstHop}
            />
            {isMultiHopTrade && lastHop && (
              <SecondHop
                tradeQuoteStep={lastHop}
                swapperName={swapperName}
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
