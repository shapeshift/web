import { Box, Text, useColorModeValue } from '@chakra-ui/react'
import { memo, useMemo } from 'react'

import { SendStep, StepStatus, useSendExecution } from '../../hooks/useSendExecution'
import type { ToolUIProps } from '../../types/toolInvocation'
import type { SendOutput } from '../../types/toolOutput'
import { TxStepCard } from './TxStepCard'

const firstFourLastFour = (address: string): string => {
  if (address.length <= 8) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const SendUI = memo(({ toolPart }: ToolUIProps) => {
  const { state, output, toolCallId } = toolPart
  const sendOutput = output as SendOutput | undefined

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
      return { type: 'error' as const, text: 'Failed to prepare send transaction' }
    }
    if (error) {
      return { type: 'error' as const, text: `Send failed: ${error}` }
    }
    if (sendTxHash) {
      return {
        type: 'success' as const,
        text: `Transaction sent: ${firstFourLastFour(sendTxHash)}`,
      }
    }
    return null
  })()

  return (
    <TxStepCard.Root>
      <TxStepCard.Header>
        <TxStepCard.HeaderRow>
          <Text fontSize='lg' fontWeight='semibold'>
            Send Crypto
          </Text>
        </TxStepCard.HeaderRow>
      </TxStepCard.Header>

      <TxStepCard.Content>
        <TxStepCard.Stepper completedCount={completedCount} totalCount={2}>
          <TxStepCard.Step status={preparationStep.status} connectorBottom>
            Preparing send transaction
          </TxStepCard.Step>
          <TxStepCard.Step status={sendStep.status} connectorTop>
            Sign and send transaction
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
})

SendUI.displayName = 'SendUI'
