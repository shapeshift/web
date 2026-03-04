import { ArrowUpDownIcon, WarningIcon } from '@chakra-ui/icons'
import { Box, Center, Collapse, Flex, HStack, Progress } from '@chakra-ui/react'
import type { SupportedTradeQuoteStepIndex, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapperName, TransactionExecutionState } from '@shapeshiftoss/swapper'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  getHopExecutionStateSummaryStepTranslation,
  isPermit2Hop,
  StepperStep as StepperStepEnum,
} from '../helpers'
import { useCurrentHopIndex } from '../hooks/useCurrentHopIndex'
import { useHopProgress } from '../hooks/useHopProgress'
import { useStepperSteps } from '../hooks/useStepperSteps'
import { useTradeButtonProps } from '../hooks/useTradeButtonProps'
import { useTradeNetworkFeeCryptoBaseUnit } from '../hooks/useTradeNetworkFeeCryptoBaseUnit'
import { StepperStep } from '../StepperStep'
import { ExpandedStepperSteps } from './ExpandedStepperSteps'

import { AnimatedCheck } from '@/components/AnimatedCheck'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { RawText, Text } from '@/components/Text'
import { bn } from '@/lib/bignumber/bignumber'
import { selectIsActiveQuoteMultiHop } from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteErrors,
  selectConfirmedTradeExecutionState,
  selectHopExecutionMetadata,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

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

  const stepsLength = useMemo(() => activeTradeQuote?.steps.length ?? 1, [activeTradeQuote])
  // Ternary to satisfy TS, if we're here, we should have a trade quote already
  const lastHopIndex = useMemo(() => stepsLength - 1, [stepsLength]) as SupportedTradeQuoteStepIndex

  // Introspects both hops to determine the holistic swap progress
  const firstHopProgress = useHopProgress(0, activeTradeId)
  const lastHopProgress = useHopProgress(lastHopIndex, activeTradeId)

  const swapProgressValue = useMemo(() => {
    if (!firstHopProgress) return 0

    if (!isMultiHopTrade) return firstHopProgress.progress

    return bn(firstHopProgress.progress)
      .plus(lastHopProgress?.progress ?? 0)
      .div(stepsLength)
      .toNumber()
  }, [firstHopProgress, lastHopProgress, isMultiHopTrade, stepsLength])

  const swapProgressStatus = useMemo(() => {
    if (!firstHopProgress) return
    if (!isMultiHopTrade) return firstHopProgress.status

    if ([firstHopProgress.status, lastHopProgress?.status].includes('failed')) return 'failed'
    if ([firstHopProgress.status, lastHopProgress?.status].every(status => status === 'complete'))
      return 'complete'

    return
  }, [firstHopProgress, lastHopProgress, isMultiHopTrade])

  const colorScheme = useMemo(() => {
    if (swapProgressStatus === 'complete') return 'green'
    if (swapProgressStatus === 'failed') return 'red'
  }, [swapProgressStatus])

  const tradeButtonProps = useTradeButtonProps({
    // Satify TS, if we are here, we have a quote already, and we don't want to make this optional in every other hooks consumed in the tree
    tradeQuoteStep: activeTradeQuote?.steps[currentHopIndex] as TradeQuoteStep,
    currentHopIndex,
    activeTradeId: activeTradeId ?? '',
    isExactAllowance: true,
  })

  const isPermit2 = useMemo(() => {
    return isPermit2Hop(activeTradeQuote?.steps[currentHopIndex] as TradeQuoteStep)
  }, [activeTradeQuote?.steps, currentHopIndex])

  const {
    isLoading: isNetworkFeeCryptoBaseUnitLoading,
    isRefetching: isNetworkFeeCryptoBaseUnitRefetching,
  } = useTradeNetworkFeeCryptoBaseUnit({
    hopIndex: currentHopIndex,
    enabled:
      (currentTradeStep === StepperStepEnum.FirstHopSwap ||
        currentTradeStep === StepperStepEnum.LastHopSwap) &&
      // Stop fetching once the Tx is executed for this step
      hopExecutionState === HopExecutionState.AwaitingSwap &&
      swapTxState === TransactionExecutionState.AwaitingConfirmation,
  })

  const isPermit2Loading = useMemo(() => {
    if (!confirmedTradeExecutionState) return true

    return (
      swapperName === SwapperName.Zrx &&
      isPermit2 &&
      !activeTradeQuote?.steps[currentHopIndex]?.permit2Eip712 &&
      ![TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
        confirmedTradeExecutionState,
      ) &&
      !activeQuoteError
    )
  }, [
    isPermit2,
    activeTradeQuote?.steps,
    currentHopIndex,
    confirmedTradeExecutionState,
    activeQuoteError,
    swapperName,
  ])

  const isCircularProgressIndeterminate = useMemo(() => {
    if (!confirmedTradeExecutionState) return true

    return (
      swapTxState === TransactionExecutionState.Pending ||
      confirmedTradeExecutionState === TradeExecutionState.Initializing ||
      tradeButtonProps?.isLoading ||
      isNetworkFeeCryptoBaseUnitLoading ||
      isNetworkFeeCryptoBaseUnitRefetching ||
      isPermit2Loading
    )
  }, [
    confirmedTradeExecutionState,
    swapTxState,
    tradeButtonProps?.isLoading,
    isPermit2Loading,
    isNetworkFeeCryptoBaseUnitLoading,
    isNetworkFeeCryptoBaseUnitRefetching,
  ])

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
            <CircularProgress size='20px' isIndeterminate={isCircularProgressIndeterminate} />
          </Center>
        )
    }
  }, [confirmedTradeExecutionState, activeQuoteError, swapTxState, isCircularProgressIndeterminate])

  const firstHopMetadataFilter = useMemo(
    () => ({
      tradeId: activeTradeId ?? '',
      hopIndex: 0,
    }),
    [activeTradeId],
  )

  const lastHopMetadataFilter = useMemo(
    () => ({
      tradeId: activeTradeId ?? '',
      hopIndex: 1,
    }),
    [activeTradeId],
  )

  const firstHopMetadata = useSelectorWithArgs(selectHopExecutionMetadata, firstHopMetadataFilter)
  const lastHopMetadata = useSelectorWithArgs(selectHopExecutionMetadata, lastHopMetadataFilter)

  const currentHopMessage = useMemo(() => {
    if (!isMultiHopTrade) {
      return firstHopMetadata?.swap.message
    }
    return currentHopIndex === 0 ? firstHopMetadata?.swap.message : lastHopMetadata?.swap.message
  }, [
    currentHopIndex,
    firstHopMetadata?.swap.message,
    lastHopMetadata?.swap.message,
    isMultiHopTrade,
  ])

  const titleElement = useMemo(() => {
    if (!hopExecutionState) return null

    const stepSummaryTranslation = getHopExecutionStateSummaryStepTranslation(
      hopExecutionState,
      swapperName ?? '',
    )

    if (!stepSummaryTranslation && !currentHopMessage) return null

    // Messaging always first for top-level swap status, but we may not have it/yet
    const displayText = currentHopMessage ?? stepSummaryTranslation

    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1} gap={2} minWidth={0}>
        <Text translation={displayText} noOfLines={2} />
        <HStack mr={2} flexShrink={0}>
          <Progress value={swapProgressValue} width='100px' size='xs' colorScheme={colorScheme} />
          <ArrowUpDownIcon boxSize={3} color='gray.500' />
        </HStack>
      </Flex>
    )
  }, [hopExecutionState, swapProgressValue, swapperName, colorScheme, currentHopMessage])

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

  const intervalRef = useRef<NodeJS.Timeout>(undefined)

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
