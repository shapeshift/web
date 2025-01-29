import { ArrowUpDownIcon, WarningIcon } from '@chakra-ui/icons'
import { Box, Center, Collapse, Flex, HStack, Progress } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatedCheck } from 'components/AnimatedCheck'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText, Text } from 'components/Text'
import {
  selectActiveQuote,
  selectActiveQuoteErrors,
  selectConfirmedTradeExecutionState,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import {
  getHopExecutionStateSummaryStepTranslation,
  StepperStep as StepperStepEnum,
} from '../helpers'
import { useCurrentHopIndex } from '../hooks/useCurrentHopIndex'
import { useStepperSteps } from '../hooks/useStepperSteps'
import { StepperStep } from '../StepperStep'
import { ExpandedStepperSteps } from './ExpandedStepperSteps'

const collapseStyle = { width: '100%' }

type ExpandableStepperStepsProps = {
  isExpanded?: boolean
}

export const ExpandableStepperSteps = ({
  isExpanded: initialIsExpanded = false,
}: ExpandableStepperStepsProps) => {
  const [isExpanded, setIsExpanded] = useState(initialIsExpanded)
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const summaryStepProps = useMemo(
    () => ({
      py: 0,
      onClick: () => setIsExpanded(!isExpanded),
      cursor: 'pointer',
      'data-expanded': isExpanded,
    }),
    [isExpanded],
  )
  const currentHopIndex = useCurrentHopIndex()
  const { currentTradeStep } = useStepperSteps()
  const activeTradeQuote = useAppSelector(selectActiveQuote)
  const activeTradeId = activeTradeQuote?.id
  const activeQuoteErrors = useAppSelector(selectActiveQuoteErrors)
  const activeQuoteError = useMemo(() => activeQuoteErrors?.[0], [activeQuoteErrors])
  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId ?? '',
      hopIndex: currentHopIndex ?? 0,
    }
  }, [activeTradeId, currentHopIndex])
  const swapperName = activeTradeQuote?.steps[0].source
  const {
    state: hopExecutionState,
    swap: { state: swapTxState, sellTxHash },
  } = useSelectorWithArgs(selectHopExecutionMetadata, hopExecutionMetadataFilter)

  const summaryStepIndicator = useMemo(() => {
    switch (true) {
      case confirmedTradeExecutionState === TradeExecutionState.TradeComplete:
        return (
          <Center boxSize='32px' borderWidth='2px' borderColor='border.base' borderRadius='full'>
            <AnimatedCheck />
          </Center>
        )
      case !!activeQuoteError:
      case swapTxState === TransactionExecutionState.Failed:
        return (
          <Center boxSize='32px' borderWidth='2px' borderColor='border.base' borderRadius='full'>
            <WarningIcon color='red.500' />
          </Center>
        )
      default:
        return (
          <Center boxSize='32px' borderWidth='2px' borderColor='border.base' borderRadius='full'>
            <CircularProgress size='20px' isIndeterminate />
          </Center>
        )
    }
  }, [confirmedTradeExecutionState, activeQuoteError, swapTxState])

  const { totalSteps, currentTradeStepIndex: currentStep } = useStepperSteps()
  const progressValue = (currentStep / (totalSteps - 1)) * 100

  const titleElement = useMemo(() => {
    if (!hopExecutionState) return null
    const stepSummaryTranslation = getHopExecutionStateSummaryStepTranslation(
      hopExecutionState,
      swapperName ?? '',
    )
    if (!stepSummaryTranslation) return null

    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1} gap={2}>
        <Text translation={stepSummaryTranslation} />
        <HStack mr={2}>
          <Progress
            value={progressValue}
            width='100px'
            size='xs'
            colorScheme={
              confirmedTradeExecutionState === TradeExecutionState.TradeComplete ? 'green' : 'blue'
            }
          />
          <ArrowUpDownIcon boxSize={3} color='gray.500' />
        </HStack>
      </Flex>
    )
  }, [hopExecutionState, progressValue, swapperName, confirmedTradeExecutionState])

  const estimatedCompletionTimeForStepMs: number = useMemo(() => {
    switch (currentTradeStep) {
      case StepperStepEnum.FirstHopSwap:
        return activeTradeQuote?.steps[0]?.estimatedExecutionTimeMs ?? 0
      case StepperStepEnum.LastHopSwap:
        return activeTradeQuote?.steps[1]?.estimatedExecutionTimeMs ?? 0
      default:
        return 0
    }
  }, [currentTradeStep, activeTradeQuote?.steps])

  const [timeLeft, setTimeLeft] = useState(estimatedCompletionTimeForStepMs)

  const intervalRef = useRef<NodeJS.Timeout>()

  // Reset the timer when the hop/step changes
  useEffect(() => {
    setTimeLeft(estimatedCompletionTimeForStepMs)
    // Clear any existing interval
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [estimatedCompletionTimeForStepMs])

  useEffect(() => {
    // Only start the timer when the transaction is submitted on chain
    if (!sellTxHash) return

    intervalRef.current = setInterval(() => {
      if (timeLeft > 0) {
        setTimeLeft(prev => prev - 1000)
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, 1000)

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sellTxHash, timeLeft])

  const estimatedCompletionTimeElement = useMemo(() => {
    if (estimatedCompletionTimeForStepMs <= 0) return null
    return (
      <Flex
        justifyContent='space-between'
        alignItems='center'
        background='background.surface.overlay.base'
        width='full'
        borderTopRadius='xl'
        px={4}
        py={2}
      >
        <Text color='text.subtle' translation='trade.estimatedCompletionTime' />
        <RawText color='text.subtle' ml='auto'>
          <RawText>{dayjs.duration(timeLeft).format('mm:ss')}</RawText>
        </RawText>
      </Flex>
    )
  }, [estimatedCompletionTimeForStepMs, timeLeft])

  if (!titleElement) return null

  return (
    <>
      {estimatedCompletionTimeElement}
      <StepperStep
        title={titleElement}
        stepIndicator={summaryStepIndicator}
        stepProps={summaryStepProps}
        useSpacer={false}
      />
      <Collapse in={isExpanded} style={collapseStyle}>
        <Box pb={2} px={3}>
          {activeTradeQuote && <ExpandedStepperSteps activeTradeQuote={activeTradeQuote} />}
        </Box>
      </Collapse>
    </>
  )
}
