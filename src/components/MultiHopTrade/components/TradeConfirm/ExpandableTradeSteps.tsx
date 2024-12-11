import { ArrowUpDownIcon } from '@chakra-ui/icons'
import { Box, Collapse, Flex, HStack, Progress, Spinner } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { Text } from 'components/Text'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { StepperStep } from '../MultiHopTradeConfirm/components/StepperStep'
import { ExpandedTradeSteps } from './ExpandedTradeSteps'
import { getHopExecutionStateSummaryStepTranslation } from './helpers'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { useTradeSteps } from './hooks/useTradeSteps'

const summaryStepIndicator = <Spinner thickness='3px' size='md' />

export const ExpandableTradeSteps = () => {
  const [isExpanded, setIsExpanded] = useState(false)
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
  const activeTradeId = useAppSelector(selectActiveQuote)?.id
  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId ?? '',
      hopIndex: currentHopIndex ?? 0,
    }
  }, [activeTradeId, currentHopIndex])
  const swapperName = useAppSelector(selectActiveSwapperName)
  const { state: hopExecutionState } = useSelectorWithArgs(
    selectHopExecutionMetadata,
    hopExecutionMetadataFilter,
  )

  const { totalSteps, currentStep } = useTradeSteps()
  const progressValue = (currentStep / totalSteps) * 100

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
          <Progress value={progressValue} width='100px' size='xs' colorScheme='blue' />
          <ArrowUpDownIcon boxSize={3} color='gray.500' />
        </HStack>
      </Flex>
    )
  }, [hopExecutionState, progressValue, swapperName])

  if (!titleElement) return null

  return (
    <>
      <StepperStep
        title={titleElement}
        stepIndicator={summaryStepIndicator}
        stepProps={summaryStepProps}
        useSpacer={false}
      />
      <Collapse in={isExpanded}>
        <Box py={4} pl={0}>
          <ExpandedTradeSteps />
        </Box>
      </Collapse>
    </>
  )
}
