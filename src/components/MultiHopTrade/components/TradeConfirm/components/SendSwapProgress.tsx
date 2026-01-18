import { CheckIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Step,
  StepIcon,
  StepIndicator,
  StepSeparator,
  StepStatus,
  Stepper,
  StepTitle,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useMemo } from 'react'

import type { SendSwapQuoteStatus } from '@/lib/sendSwapApi'
import { QuoteStatus } from '@/state/slices/sendSwapSlice/types'

type SendSwapProgressProps = {
  status: SendSwapQuoteStatus
}

export const SendSwapProgress = ({ status }: SendSwapProgressProps) => {
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const stepTitleColor = useColorModeValue('gray.600', 'gray.400')
  const completedColor = useColorModeValue('green.500', 'green.300')
  const failedColor = useColorModeValue('red.500', 'red.300')

  const steps = useMemo(() => {
    const baseSteps = [
      {
        title: 'Quote Created',
        description: new Date(status.createdAt).toLocaleString(),
        isComplete: true,
      },
    ]

    if (status.depositTxHash) {
      baseSteps.push({
        title: 'Deposit Received',
        description: `Tx: ${status.depositTxHash.slice(0, 10)}...`,
        isComplete: true,
      })
    }

    // Add progress steps from status history
    status.statusHistory.forEach(entry => {
      baseSteps.push({
        title: entry.step,
        description: new Date(entry.timestamp).toLocaleTimeString(),
        isComplete: true,
      })
    })

    // Add current step if different from history
    if (status.currentStep && status.currentStep !== status.statusHistory[status.statusHistory.length - 1]?.step) {
      baseSteps.push({
        title: status.currentStep,
        description: 'In progress...',
        isComplete: false,
      })
    }

    if (status.executionTxHash) {
      baseSteps.push({
        title: 'Swap Completed',
        description: `Tx: ${status.executionTxHash.slice(0, 10)}...`,
        isComplete: true,
      })
    }

    return baseSteps
  }, [status])

  const activeStep = useMemo(() => {
    return steps.findIndex(step => !step.isComplete)
  }, [steps])

  const statusColor = useMemo(() => {
    if (status.status === QuoteStatus.FAILED) return failedColor
    if (status.status === QuoteStatus.COMPLETED) return completedColor
    return undefined
  }, [status.status, failedColor, completedColor])

  return (
    <Box>
      {/* Status Badge */}
      <Flex mb={4} alignItems='center' gap={2}>
        <Text fontWeight='bold'>Status:</Text>
        <Flex alignItems='center' gap={2}>
          {status.status === QuoteStatus.COMPLETED && <CheckIcon color={completedColor} />}
          {status.status === QuoteStatus.FAILED && <WarningIcon color={failedColor} />}
          <Text color={statusColor} fontWeight='medium'>
            {status.status}
          </Text>
        </Flex>
      </Flex>

      {/* Progress Stepper */}
      <Stepper index={activeStep} orientation='vertical' gap='0' my={4}>
        {steps.map((step, index) => (
          <Step key={index}>
            <StepIndicator>
              <StepStatus
                complete={<StepIcon />}
                incomplete={<Box w='8px' h='8px' borderRadius='full' bg='gray.300' />}
                active={<Box w='8px' h='8px' borderRadius='full' bg='blue.500' />}
              />
            </StepIndicator>

            <Box flexShrink='0' ml={4} pb={index === steps.length - 1 ? 0 : 6}>
              <StepTitle>
                <Text fontSize='sm' fontWeight='medium'>
                  {step.title}
                </Text>
              </StepTitle>
              <Text fontSize='xs' color={stepTitleColor} mt={1}>
                {step.description}
              </Text>
            </Box>

            {index !== steps.length - 1 && <StepSeparator borderColor={borderColor} />}
          </Step>
        ))}
      </Stepper>

      {/* Expiry Warning */}
      {status.isExpired && (
        <Box
          mt={4}
          p={3}
          borderRadius='md'
          bg={useColorModeValue('orange.50', 'orange.900')}
          borderWidth='1px'
          borderColor={useColorModeValue('orange.200', 'orange.700')}
        >
          <Flex alignItems='center' gap={2}>
            <WarningIcon color={useColorModeValue('orange.500', 'orange.300')} />
            <Text fontSize='sm' fontWeight='medium'>
              Quote has expired
            </Text>
          </Flex>
          <Text fontSize='xs' mt={1} color={stepTitleColor}>
            Expired at: {new Date(status.expiresAt).toLocaleString()}
          </Text>
        </Box>
      )}
    </Box>
  )
}
