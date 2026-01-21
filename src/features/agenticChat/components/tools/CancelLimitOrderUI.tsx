import { Box, Text, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'

import {
  CancelLimitOrderStep,
  StepStatus,
  useCancelLimitOrderExecution,
} from '../../hooks/useCancelLimitOrderExecution'
import type { ToolUIProps } from '../../types/toolInvocation'
import type { CancelLimitOrderOutput } from '../../types/toolOutput'
import { TxStepCard } from './TxStepCard'

export const CancelLimitOrderUI = ({ toolPart }: ToolUIProps) => {
  const { state, output, toolCallId } = toolPart
  const cancelOutput = output as CancelLimitOrderOutput | undefined

  const cancelData = state === 'output-available' && cancelOutput ? cancelOutput : null
  const { error, steps } = useCancelLimitOrderExecution(toolCallId, state, cancelData)

  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const errorColor = useColorModeValue('red.500', 'red.400')

  const completedCount = useMemo(
    () =>
      steps.filter(s => s.status === StepStatus.COMPLETE || s.status === StepStatus.SKIPPED).length,
    [steps],
  )

  const preparationStep = steps.find(s => s.step === CancelLimitOrderStep.PREPARE)
  const signStep = steps.find(s => s.step === CancelLimitOrderStep.SIGN)
  const submitStep = steps.find(s => s.step === CancelLimitOrderStep.SUBMIT)

  if (!preparationStep || !signStep || !submitStep) {
    return null
  }

  const footerMessage = (() => {
    if (toolPart.state === 'output-error') {
      return { type: 'error' as const, text: 'Failed to prepare cancellation' }
    }
    if (error) {
      return { type: 'error' as const, text: `Cancellation failed: ${error}` }
    }
    if (submitStep.status === StepStatus.COMPLETE) {
      return { type: 'success' as const, text: 'Order cancelled successfully' }
    }
    return null
  })()

  return (
    <TxStepCard.Root>
      <TxStepCard.Header>
        <TxStepCard.HeaderRow>
          <Text fontSize='lg' fontWeight='semibold'>
            Cancel Limit Order
          </Text>
        </TxStepCard.HeaderRow>
        {cancelData && (
          <Box mt={2}>
            <Text fontSize='sm' color={mutedColor}>
              Network: {cancelData.network}
            </Text>
            <Text fontSize='xs' color={mutedColor} fontFamily='mono'>
              Order: {cancelData.orderId.slice(0, 10)}...{cancelData.orderId.slice(-8)}
            </Text>
          </Box>
        )}
      </TxStepCard.Header>

      <TxStepCard.Content>
        <TxStepCard.Stepper completedCount={completedCount} totalCount={3}>
          <TxStepCard.Step status={preparationStep.status} connectorBottom>
            Preparing cancellation
          </TxStepCard.Step>
          <TxStepCard.Step status={signStep.status} connectorTop connectorBottom>
            Sign cancellation
          </TxStepCard.Step>
          <TxStepCard.Step status={submitStep.status} connectorTop>
            Submit cancellation
          </TxStepCard.Step>
          {footerMessage && (
            <Box mt={4}>
              <Text
                fontSize='sm'
                fontWeight='medium'
                color={footerMessage.type === 'error' ? errorColor : mutedColor}
              >
                {footerMessage.text}
              </Text>
            </Box>
          )}
        </TxStepCard.Stepper>
      </TxStepCard.Content>
    </TxStepCard.Root>
  )
}
