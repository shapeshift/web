import { Box, Text, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import {
  CancelLimitOrderStep,
  StepStatus,
  useCancelLimitOrderExecution,
} from '../../hooks/useCancelLimitOrderExecution'
import type { ToolUIProps } from '../../types/toolInvocation'
import { TxStepCard } from './TxStepCard'

export const CancelLimitOrderUI = ({ toolPart }: ToolUIProps<'cancelLimitOrderTool'>) => {
  const { state, output: cancelOutput, toolCallId } = toolPart
  const translate = useTranslate()

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
      return {
        type: 'error' as const,
        text: translate('agenticChat.agenticChatTools.cancelLimitOrder.errors.prepareFailed'),
      }
    }
    if (error) {
      return {
        type: 'error' as const,
        text: `${translate(
          'agenticChat.agenticChatTools.cancelLimitOrder.cancellationFailed',
        )}: ${error}`,
      }
    }
    if (submitStep.status === StepStatus.COMPLETE) {
      return {
        type: 'success' as const,
        text: translate('agenticChat.agenticChatTools.cancelLimitOrder.orderCancelledSuccessfully'),
      }
    }
    return null
  })()

  return (
    <TxStepCard.Root>
      <TxStepCard.Header>
        <TxStepCard.HeaderRow>
          <Text fontSize='lg' fontWeight='semibold'>
            {translate('agenticChat.agenticChatTools.cancelLimitOrder.title')}
          </Text>
        </TxStepCard.HeaderRow>
        {cancelData && (
          <Box mt={2}>
            <Text fontSize='sm' color={mutedColor}>
              {translate('agenticChat.agenticChatTools.cancelLimitOrder.networkLabel')}:{' '}
              {cancelData.network}
            </Text>
            <Text fontSize='xs' color={mutedColor} fontFamily='mono'>
              {translate('agenticChat.agenticChatTools.cancelLimitOrder.orderLabel')}:{' '}
              {cancelData.orderId.slice(0, 10)}...{cancelData.orderId.slice(-8)}
            </Text>
          </Box>
        )}
      </TxStepCard.Header>

      <TxStepCard.Content>
        <TxStepCard.Stepper completedCount={completedCount} totalCount={3}>
          <TxStepCard.Step status={preparationStep.status} connectorBottom>
            {translate('agenticChat.agenticChatTools.cancelLimitOrder.steps.prepare')}
          </TxStepCard.Step>
          <TxStepCard.Step status={signStep.status} connectorTop connectorBottom>
            {translate('agenticChat.agenticChatTools.cancelLimitOrder.steps.sign')}
          </TxStepCard.Step>
          <TxStepCard.Step status={submitStep.status} connectorTop>
            {translate('agenticChat.agenticChatTools.cancelLimitOrder.steps.submit')}
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
