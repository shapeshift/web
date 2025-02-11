import { ArrowUpDownIcon, WarningIcon } from '@chakra-ui/icons'
import { Box, Center, Collapse, Flex, HStack, Progress } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatedCheck } from 'components/AnimatedCheck'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText, Text } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import { selectIsActiveQuoteMultiHop } from 'state/slices/tradeInputSlice/selectors'
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
import { useHopProgress } from '../hooks/useHopProgress'
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
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
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

  // Get progress from both hops
  const firstHopProgress = useHopProgress(0, activeTradeId)
  const lastHopProgress = useHopProgress(1, activeTradeId)

  // Calculate total progress based on single vs multi-hop
  const progressValue = useMemo(() => {
    if (!firstHopProgress) return 0

    if (!isMultiHopTrade) return firstHopProgress.progress

    return bn(firstHopProgress.progress)
      .plus(lastHopProgress?.progress ?? 0)
      .div(2)
      .toNumber()
  }, [firstHopProgress, lastHopProgress, activeTradeQuote?.steps])

  // Determine overall status
  const totalProgressStatus = useMemo(() => {
    if (!firstHopProgress) return 'default'
    const isMultiHop = !!activeTradeQuote?.steps[1]

    // Single-hop trade
    if (!isMultiHop) return firstHopProgress.status

    // Multi-hop trade
    if (firstHopProgress.status === 'failed' || lastHopProgress?.status === 'failed')
      return 'failed'
    if (firstHopProgress.status === 'complete' && lastHopProgress?.status === 'complete')
      return 'complete'
    return 'default'
  }, [firstHopProgress, lastHopProgress, activeTradeQuote?.steps])

  // Set progress bar color based on status
  const colorScheme = useMemo(() => {
    if (totalProgressStatus === 'complete') return 'green'
    if (totalProgressStatus === 'failed') return 'red'
    return 'blue'
  }, [totalProgressStatus])

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
          <Progress value={progressValue} width='100px' size='xs' colorScheme={colorScheme} />
          <ArrowUpDownIcon boxSize={3} color='gray.500' />
        </HStack>
      </Flex>
    )
  }, [hopExecutionState, progressValue, swapperName, colorScheme])

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

  const formattedDuration = useMemo(() => {
    const duration = dayjs.duration(timeLeft)
    const hasDays = duration.days() > 0
    const hasHours = duration.hours() > 0
    const hasMinutes = duration.minutes() > 0

    // Show all units from highest non-zero to seconds
    if (hasDays) {
      return `${duration.format('D')}d ${duration.format('H')}h ${duration.format(
        'm',
      )}m ${duration.format('ss')}s`
    }
    if (hasHours) {
      return `${duration.format('H')}h ${duration.format('m')}m ${duration.format('ss')}s`
    }
    if (hasMinutes) {
      return `${duration.format('m')}m ${duration.format('ss')}s`
    }
    return `${duration.format('ss')}s`
  }, [timeLeft])

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
          <RawText>{formattedDuration}</RawText>
        </RawText>
      </Flex>
    )
  }, [estimatedCompletionTimeForStepMs, formattedDuration])

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
