import { Box, Text, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { SendStep, StepStatus, useSendExecution } from '../../hooks/useSendExecution'
import type { ToolUIProps } from '../../types/toolInvocation'
import type { SendOutput } from '../../types/toolOutput'
import { TxStepCard } from './TxStepCard'

import { middleEllipsis } from '@/lib/utils'

export const SendUI = ({ toolPart }: ToolUIProps) => {
  const { state, output, toolCallId } = toolPart
  const sendOutput = output as SendOutput | undefined
  const translate = useTranslate()

  const sendData = state === 'output-available' && sendOutput ? sendOutput : null
  const { error, steps, sendTxHash } = useSendExecution(toolCallId, state, sendData)

  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const errorColor = useColorModeValue('red.500', 'red.400')

  const completedCount = useMemo(
    () =>
      steps.filter(s => s.status === StepStatus.COMPLETE || s.status === StepStatus.SKIPPED).length,
    [steps],
  )

  const preparationStep = steps.find(s => s.step === SendStep.PREPARATION)
  const sendStep = steps.find(s => s.step === SendStep.SEND)

  if (!preparationStep || !sendStep) {
    return null
  }

  const footerMessage = (() => {
    if (toolPart.state === 'output-error') {
      return {
        type: 'error' as const,
        text: translate('agenticChat.agenticChatTools.send.errors.prepareFailed'),
      }
    }
    if (error) {
      return {
        type: 'error' as const,
        text: translate('agenticChat.agenticChatTools.send.errors.sendFailed', { error }),
      }
    }
    if (sendTxHash) {
      return {
        type: 'success' as const,
        text: translate('agenticChat.agenticChatTools.send.success.transactionSent', {
          txHash: middleEllipsis(sendTxHash),
        }),
      }
    }
    return null
  })()

  return (
    <TxStepCard.Root>
      <TxStepCard.Header>
        <TxStepCard.HeaderRow>
          <Text fontSize='lg' fontWeight='semibold'>
            {translate('agenticChat.agenticChatTools.send.title')}
          </Text>
        </TxStepCard.HeaderRow>
      </TxStepCard.Header>

      <TxStepCard.Content>
        <TxStepCard.Stepper completedCount={completedCount} totalCount={2}>
          <TxStepCard.Step status={preparationStep.status} connectorBottom>
            {translate('agenticChat.agenticChatTools.send.steps.preparation')}
          </TxStepCard.Step>
          <TxStepCard.Step status={sendStep.status} connectorTop>
            {translate('agenticChat.agenticChatTools.send.steps.send')}
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
