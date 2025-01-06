import { ArrowUpDownIcon, WarningIcon } from '@chakra-ui/icons'
import { Box, Collapse, Flex, HStack, Progress, Spinner } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { AnimatedCheck } from 'components/AnimatedCheck'
import { Text } from 'components/Text'
import {
  selectActiveQuote,
  selectActiveQuoteErrors,
  selectConfirmedTradeExecutionState,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { StepperStep } from '../MultiHopTradeConfirm/components/StepperStep'
import { ExpandedStepperSteps } from './ExpandedStepperSteps'
import { getHopExecutionStateSummaryStepTranslation } from './helpers'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { useStepperSteps } from './hooks/useStepperSteps'

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
      alignItems: 'center',
      py: 2,
      onClick: () => setIsExpanded(!isExpanded),
      cursor: 'pointer',
    }),
    [isExpanded],
  )
  const currentHopIndex = useCurrentHopIndex()
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
    swap: { state: swapTxState },
  } = useSelectorWithArgs(selectHopExecutionMetadata, hopExecutionMetadataFilter)

  const summaryStepIndicator = useMemo(() => {
    switch (true) {
      case confirmedTradeExecutionState === TradeExecutionState.TradeComplete:
        return <AnimatedCheck />
      case !!activeQuoteError:
      case swapTxState === TransactionExecutionState.Failed:
        return <WarningIcon color='red.500' />
      default:
        return <Spinner thickness='3px' size='md' />
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
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
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

  if (!titleElement) return null

  return (
    <>
      <StepperStep
        title={titleElement}
        stepIndicator={summaryStepIndicator}
        stepProps={summaryStepProps}
        useSpacer={false}
      />
      <Collapse in={isExpanded} style={collapseStyle}>
        <Box py={4} pl={0}>
          {activeTradeQuote && <ExpandedStepperSteps activeTradeQuote={activeTradeQuote} />}
        </Box>
      </Collapse>
    </>
  )
}
