import { CheckCircleIcon } from '@chakra-ui/icons'
import { Box, Flex, HStack, VStack } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { WithdrawStep } from './withdrawMachine'
import { WithdrawMachineCtx } from './WithdrawMachineContext'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { RawText } from '@/components/Text'

type StepConfig = {
  id: WithdrawStep
  labelKey: string
}

const BATCH_STEPS: StepConfig[] = [
  { id: 'signing_batch', labelKey: 'chainflipLending.withdraw.steps.signingBatch' },
  { id: 'confirming', labelKey: 'chainflipLending.withdraw.steps.confirming' },
]

const SEQUENTIAL_STEPS: StepConfig[] = [
  { id: 'signing_remove', labelKey: 'chainflipLending.withdraw.steps.signingRemove' },
  { id: 'signing_egress', labelKey: 'chainflipLending.withdraw.steps.signingEgress' },
  { id: 'confirming', labelKey: 'chainflipLending.withdraw.steps.confirming' },
]

type StepStatus = 'completed' | 'active' | 'error' | 'pending'

const stepIconSize = 5
const checkCircleIcon = <CheckCircleIcon boxSize={stepIconSize} color='green.500' />

export const WithdrawStepper = memo(() => {
  const translate = useTranslate()
  const stateValue = WithdrawMachineCtx.useSelector(s => s.value) as string
  const { useBatch, errorStep } = WithdrawMachineCtx.useSelector(s => ({
    useBatch: s.context.useBatch,
    errorStep: s.context.errorStep,
  }))

  const steps = useMemo(() => (useBatch ? BATCH_STEPS : SEQUENTIAL_STEPS), [useBatch])

  const stepOrder = useMemo(() => steps.map(s => s.id), [steps])

  const getStepStatus = useMemo(() => {
    const currentIndex = stepOrder.indexOf(stateValue as WithdrawStep)
    const isError = stateValue === 'error'

    return (stepId: WithdrawStep): StepStatus => {
      if (isError && errorStep === stepId) return 'error'

      const stepIndex = stepOrder.indexOf(stepId)
      if (isError) {
        const errorIndex = stepOrder.indexOf(errorStep as WithdrawStep)
        if (stepIndex < errorIndex) return 'completed'
        if (stepIndex > errorIndex) return 'pending'
        return 'error'
      }

      if (stateValue === 'success') return 'completed'
      if (stepIndex < currentIndex) return 'completed'
      if (stepIndex === currentIndex) return 'active'
      return 'pending'
    }
  }, [stateValue, errorStep, stepOrder])

  return (
    <VStack spacing={3} align='stretch' width='full'>
      {steps.map(step => {
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
            <Flex alignItems='center' justifyContent='space-between' flex={1}>
              <RawText
                fontSize='sm'
                fontWeight={status === 'active' ? 'bold' : 'medium'}
                color={
                  status === 'error'
                    ? 'red.500'
                    : status === 'pending'
                    ? 'text.subtle'
                    : 'text.base'
                }
              >
                {translate(step.labelKey)}
              </RawText>
            </Flex>
          </HStack>
        )
      })}
    </VStack>
  )
})
