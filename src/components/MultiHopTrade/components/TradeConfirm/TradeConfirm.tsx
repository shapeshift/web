import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Heading,
  HStack,
  Icon,
  Stack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo } from 'react'
import { useHistory } from 'react-router'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import { Footer as FooterButton } from '../MultiHopTradeConfirm/components/Footer'
import { useIsApprovalInitiallyNeeded } from '../MultiHopTradeConfirm/hooks/useIsApprovalInitiallyNeeded'
import { SwapperIcon } from '../TradeInput/components/SwapperIcon/SwapperIcon'
import { WithBackButton } from '../WithBackButton'

const cardBorderRadius = { base: 'xl' }

export const TradeConfirm = () => {
  const dispatch = useAppDispatch()
  //   const translate = useTranslate()
  const history = useHistory()
  const { isLoading } = useIsApprovalInitiallyNeeded()

  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const activeQuote = useAppSelector(selectActiveQuote)
  const swapperName = useAppSelector(selectActiveSwapperName)
  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const swapSource = tradeQuoteStep?.source

  const isTradeComplete = useMemo(
    () => confirmedTradeExecutionState === TradeExecutionState.TradeComplete,
    [confirmedTradeExecutionState],
  )

  useEffect(() => {
    if (isLoading || !activeQuote) return

    dispatch(tradeQuoteSlice.actions.setTradeInitialized(activeQuote.id))
  }, [dispatch, isLoading, activeQuote])

  const handleBack = useCallback(() => {
    if (isTradeComplete) {
      dispatch(tradeQuoteSlice.actions.clear())
    }

    history.push(TradeRoutePaths.Input)
  }, [dispatch, history, isTradeComplete])

  const handleSubmit = useCallback(() => {
    console.log('submit')
  }, [])

  const TradeDetailTable = useMemo(() => {
    if (!activeQuote) return null

    return (
      <Stack spacing={4} width='full'>
        <Row>
          <Row.Label>
            <Text translation='trade.protocol' />
          </Row.Label>
          <Row.Value>
            <HStack>
              {swapperName !== undefined && <SwapperIcon size='2xs' swapperName={swapperName} />}
              {swapSource !== undefined && <RawText>{swapSource}</RawText>}
            </HStack>
          </Row.Value>
        </Row>

        <Row>
          <Row.Label>
            <Text translation='trade.rate' />
          </Row.Label>
          <Row.Value>
            <RawText>1 METH = 0.0 ETH</RawText>
          </Row.Value>
        </Row>

        <Row>
          <Row.Label>
            <Text translation='trade.transactionFee' />
          </Row.Label>
          <Row.Value>
            <RawText>$0.00258</RawText>
          </Row.Value>
        </Row>

        <Row>
          <Row.Label>
            <Text translation='trade.shapeShiftFee' />
          </Row.Label>
          <Row.Value>
            <HStack>
              <RawText>Free</RawText>
              <RawText color='text.subtle'>(0 bps)</RawText>
            </HStack>
          </Row.Value>
        </Row>

        <Row>
          <Row.Label>
            <Text translation='trade.recipientAddress' />
          </Row.Label>
          <Row.Value>
            <HStack>
              <RawText>0xe5...971d</RawText>
              <Icon as={ExternalLinkIcon} />
            </HStack>
          </Row.Value>
        </Row>
      </Stack>
    )
  }, [activeQuote, swapSource, swapperName])

  if (!confirmedTradeExecutionState) return null

  return (
    <TradeSlideTransition>
      {/* TODO: Add WarningAcknowledgement */}
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
                    confirmedTradeExecutionState,
                  )
                    ? 'trade.confirmDetails'
                    : 'trade.trade'
                }
              />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <CardBody py={0} px={0}>
          gm
        </CardBody>
        <CardFooter bg='background.surface.overlay.base' borderBottomRadius='xl'>
          <Stack width='full'>
            {TradeDetailTable}
            <FooterButton isLoading={isLoading} handleSubmit={handleSubmit} />
          </Stack>
        </CardFooter>
      </Card>
    </TradeSlideTransition>
    // TODO: Add FeeModal
  )
}
