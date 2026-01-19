import { Box, Skeleton, Text, useColorModeValue } from '@chakra-ui/react'
import { memo, useMemo } from 'react'

import { StepStatus, useSwapExecution } from '../../hooks/useSwapExecution'
import type { ToolUIProps } from '../../types/toolInvocation'
import type { SwapOutput } from '../../types/toolOutput'
import { TxStepCard } from './TxStepCard'

const firstFourLastFour = (address: string): string => {
  if (address.length <= 8) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const SwapUI = memo(({ toolPart }: ToolUIProps) => {
  const { state, output, toolCallId } = toolPart
  const swapOutput = output as SwapOutput | undefined

  const swapData = state === 'output-available' && swapOutput ? swapOutput : null
  const { error, steps, networkName } = useSwapExecution(toolCallId, state, swapData)

  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const errorColor = useColorModeValue('red.500', 'red.400')

  const completedCount = useMemo(
    () =>
      steps.filter(s => s.status === StepStatus.COMPLETE || s.status === StepStatus.SKIPPED).length,
    [steps],
  )

  const [quoteStep, networkStep, approvalStep, confirmationStep, swapStep] = steps

  if (!quoteStep || !networkStep || !approvalStep || !confirmationStep || !swapStep) {
    return null
  }

  const hasError = state === 'output-error'
  const isLoading = !swapOutput && !hasError

  const footerMessage = (() => {
    if (state === 'output-error')
      return { type: 'error' as const, text: 'Failed to get swap quote' }
    if (error) return { type: 'error' as const, text: `Swap execution failed: ${error}` }
    return null
  })()

  const swap = swapOutput?.swapData
  const summary = swapOutput?.summary
  const address = swap?.sellAccount

  return (
    <TxStepCard.Root>
      <TxStepCard.Header>
        <TxStepCard.HeaderRow>
          {address && (
            <Text fontSize='xs' color={mutedColor} fontWeight='normal'>
              Received from {firstFourLastFour(address)}
            </Text>
          )}
          <Text fontSize='sm' color={mutedColor} fontWeight='normal'>
            {summary?.buyAsset ? (
              `$${summary.buyAsset.estimatedValueUSD}`
            ) : isLoading ? (
              <Skeleton height='20px' width='60px' />
            ) : (
              '—'
            )}
          </Text>
        </TxStepCard.HeaderRow>
        <TxStepCard.HeaderRow>
          {summary ? (
            <Text fontSize='lg' fontWeight='semibold'>
              {summary.sellAsset.symbol.toUpperCase()} → {summary.buyAsset.symbol.toUpperCase()}
            </Text>
          ) : isLoading ? (
            <Skeleton height='28px' width='120px' />
          ) : (
            <Text fontSize='lg' fontWeight='semibold'>
              Swap
            </Text>
          )}
          {isLoading ? (
            <Skeleton height='32px' width='100px' />
          ) : (
            <TxStepCard.Amount
              value={swap?.buyAmountCryptoPrecision}
              symbol={swap?.buyAsset.symbol.toUpperCase()}
            />
          )}
        </TxStepCard.HeaderRow>
      </TxStepCard.Header>

      <TxStepCard.Stepper completedCount={completedCount} totalCount={5}>
        <TxStepCard.Step status={quoteStep.status} connectorBottom>
          Getting swap quote
        </TxStepCard.Step>
        <TxStepCard.Step status={networkStep.status} connectorTop connectorBottom>
          {networkName ? `Switch to ${networkName}` : 'Switch network'}
        </TxStepCard.Step>
        <TxStepCard.Step status={approvalStep.status} connectorTop connectorBottom>
          Approve token spending
        </TxStepCard.Step>
        <TxStepCard.Step status={confirmationStep.status} connectorTop connectorBottom>
          Confirming approval
        </TxStepCard.Step>
        <TxStepCard.Step status={swapStep.status} connectorTop>
          Sign swap transaction
        </TxStepCard.Step>
        {footerMessage && (
          <Box mt={4}>
            <Text
              fontSize='sm'
              fontWeight='medium'
              color={footerMessage.type === 'error' ? errorColor : mutedColor}
              noOfLines={2}
            >
              {footerMessage.text}
            </Text>
          </Box>
        )}
      </TxStepCard.Stepper>
    </TxStepCard.Root>
  )
})

SwapUI.displayName = 'SwapUI'
