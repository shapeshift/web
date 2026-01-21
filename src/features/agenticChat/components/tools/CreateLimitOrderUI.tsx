import { Box, Link, Text, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'

import type { CreateLimitOrderStepInfo } from '../../hooks/useCreateLimitOrderExecution'
import {
  CreateLimitOrderStep,
  StepStatus,
  useCreateLimitOrderExecution,
} from '../../hooks/useCreateLimitOrderExecution'
import type { ToolUIProps } from '../../types/toolInvocation'
import type { CreateLimitOrderOutput } from '../../types/toolOutput'
import { TxStepCard } from './TxStepCard'

import { middleEllipsis } from '@/lib/utils'

export const CreateLimitOrderUI = ({ toolPart }: ToolUIProps) => {
  const { state, output, toolCallId } = toolPart
  const orderOutput = output as CreateLimitOrderOutput | undefined

  const orderData = state === 'output-available' && orderOutput ? orderOutput : null
  const { error, steps, approvalTxHash, trackingUrl } = useCreateLimitOrderExecution(
    toolCallId,
    state,
    orderData,
  )

  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const errorColor = useColorModeValue('red.500', 'red.400')
  const linkColor = useColorModeValue('blue.500', 'blue.300')

  const needsApproval = orderData?.needsApproval ?? false

  const visibleSteps = useMemo(() => {
    const preparationStep = steps.find(s => s.step === CreateLimitOrderStep.PREPARE)
    const approvalStep = steps.find(s => s.step === CreateLimitOrderStep.APPROVAL)
    const confirmationStep = steps.find(s => s.step === CreateLimitOrderStep.APPROVAL_CONFIRMATION)
    const signStep = steps.find(s => s.step === CreateLimitOrderStep.SIGN)
    const submitStep = steps.find(s => s.step === CreateLimitOrderStep.SUBMIT)

    type StepConfig = {
      step: CreateLimitOrderStepInfo
      label: string
      connectorTop?: boolean
      connectorBottom?: boolean
    }

    const allSteps: StepConfig[] = []

    if (preparationStep) {
      allSteps.push({
        step: preparationStep,
        label: 'Preparing order',
        connectorBottom: true,
      })
    }

    if (needsApproval && approvalStep) {
      allSteps.push({
        step: approvalStep,
        label: 'Approve token',
        connectorTop: true,
        connectorBottom: true,
      })
    }

    if (needsApproval && confirmationStep) {
      allSteps.push({
        step: confirmationStep,
        label: 'Confirming approval',
        connectorTop: true,
        connectorBottom: true,
      })
    }

    if (signStep) {
      allSteps.push({
        step: signStep,
        label: 'Sign order',
        connectorTop: true,
        connectorBottom: true,
      })
    }

    if (submitStep) {
      allSteps.push({
        step: submitStep,
        label: 'Submit order',
        connectorTop: true,
      })
    }

    return allSteps
  }, [steps, needsApproval])

  const completedCount = useMemo(
    () =>
      visibleSteps.filter(
        s => s.step.status === StepStatus.COMPLETE || s.step.status === StepStatus.SKIPPED,
      ).length,
    [visibleSteps],
  )

  const footerMessage = (() => {
    if (toolPart.state === 'output-error') {
      return { type: 'error' as const, text: 'Failed to prepare order' }
    }
    if (error) {
      return { type: 'error' as const, text: `Order creation failed: ${error}` }
    }
    if (approvalTxHash) {
      return { type: 'info' as const, text: `Approval tx: ${middleEllipsis(approvalTxHash)}` }
    }
    if (trackingUrl) {
      return { type: 'success' as const, text: 'Order created successfully' }
    }
    return null
  })()

  return (
    <TxStepCard.Root>
      <TxStepCard.Header>
        <TxStepCard.HeaderRow>
          <Text fontSize='lg' fontWeight='semibold'>
            Create Limit Order
          </Text>
        </TxStepCard.HeaderRow>
        {orderData && (
          <Box mt={2}>
            <Text fontSize='sm' color={mutedColor}>
              {orderData.summary.sellAsset.amount}{' '}
              {orderData.summary.sellAsset.symbol.toUpperCase()} →{' '}
              {orderData.summary.buyAsset.estimatedAmount}{' '}
              {orderData.summary.buyAsset.symbol.toUpperCase()}
            </Text>
            <Text fontSize='xs' color={mutedColor} mt={1}>
              {orderData.summary.provider} • Expires {orderData.summary.expiresAt}
            </Text>
          </Box>
        )}
      </TxStepCard.Header>

      <TxStepCard.Content>
        <TxStepCard.Stepper completedCount={completedCount} totalCount={visibleSteps.length}>
          {visibleSteps.map((stepConfig, index) => (
            <TxStepCard.Step
              key={index}
              status={stepConfig.step.status}
              connectorTop={stepConfig.connectorTop}
              connectorBottom={stepConfig.connectorBottom}
            >
              {stepConfig.label}
            </TxStepCard.Step>
          ))}
          {footerMessage && (
            <Box mt={4}>
              <Text
                fontSize='sm'
                fontWeight='medium'
                color={footerMessage.type === 'error' ? errorColor : mutedColor}
              >
                {footerMessage.text}
              </Text>
              {trackingUrl && (
                <Link href={trackingUrl} isExternal color={linkColor} fontSize='sm' mt={1}>
                  View order →
                </Link>
              )}
            </Box>
          )}
        </TxStepCard.Stepper>
      </TxStepCard.Content>
    </TxStepCard.Root>
  )
}
