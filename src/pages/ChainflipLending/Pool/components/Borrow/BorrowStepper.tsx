import { CheckCircleIcon } from '@chakra-ui/icons'
import { Box, Flex, HStack, VStack } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { BorrowStep } from './borrowMachine'
import { BorrowMachineCtx } from './BorrowMachineContext'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { RawText } from '@/components/Text'

type StepConfig = {
  id: BorrowStep
  labelKey: string
}

const ALL_STEPS: StepConfig[] = [
  { id: 'signing', labelKey: 'chainflipLending.borrow.steps.signing' },
  { id: 'confirming', labelKey: 'chainflipLending.borrow.steps.confirming' },
]

const STEP_ORDER: BorrowStep[] = ALL_STEPS.map(s => s.id)

type StepStatus = 'completed' | 'active' | 'error' | 'pending'

const stepIconSize = 5
const checkCircleIcon = <CheckCircleIcon boxSize={stepIconSize} color='green.500' />

export const BorrowStepper = memo(() => {
  const translate = useTranslate()
  const stateValue = BorrowMachineCtx.useSelector(s => s.value) as string
  const errorStep = BorrowMachineCtx.useSelector(s => s.context.errorStep)

  const getStepStatus = useMemo(() => {
    const currentIndex = STEP_ORDER.indexOf(stateValue as BorrowStep)
    const isError = stateValue === 'error'

    return (stepId: BorrowStep): StepStatus => {
      const stepIndex = STEP_ORDER.indexOf(stepId)

      if (isError && errorStep === stepId) return 'error'

      if (isError) {
        const errorIndex = STEP_ORDER.indexOf(errorStep as BorrowStep)
        if (stepIndex < errorIndex) return 'completed'
        if (stepIndex > errorIndex) return 'pending'
        return 'error'
      }

      if (stateValue === 'success') return 'completed'
      if (stepIndex < currentIndex) return 'completed'
      if (stepIndex === currentIndex) return 'active'
      return 'pending'
    }
  }, [stateValue, errorStep])

  return (
    <VStack spacing={3} align='stretch' width='full'>
      {ALL_STEPS.map(step => {
        const status = getStepStatus(step.id)
        return (
          <HStack key={step.id} spacing={3} opacity={status === 'pending' ? 0.5 : 1}>
            <Flex alignItems='center' justifyContent='center' width={6} flexShrink={0}>
              {status === 'completed' ? (
                checkCircleIcon
              ) : status === 'active' ? (
                <CircularProgress size='20px' />
              ) : status === 'error' ? (
                <Box boxSize={stepIconSize} borderRadius='full' bg='red.500' />
              ) : (
                <Box
                  boxSize={stepIconSize}
                  borderRadius='full'
                  borderWidth={2}
                  borderColor='border.base'
                />
              )}
            </Flex>
            <RawText
              fontSize='sm'
              fontWeight={status === 'active' ? 'bold' : 'medium'}
              color={
                status === 'error' ? 'red.500' : status === 'pending' ? 'text.subtle' : 'text.base'
              }
            >
              {translate(step.labelKey)}
            </RawText>
          </HStack>
        )
      })}
    </VStack>
  )
})
