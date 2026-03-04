import { Box, Flex, Skeleton, Text, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { StepStatus, useSwapExecution } from '../../hooks/useSwapExecution'
import type { ToolUIProps } from '../../types/toolInvocation'
import { TxStepCard } from './TxStepCard'

import { Amount } from '@/components/Amount/Amount'
import { middleEllipsis } from '@/lib/utils'

export const SwapUI = ({ toolPart }: ToolUIProps<'initiateSwapTool' | 'initiateSwapUsdTool'>) => {
  const { state, output: swapOutput, toolCallId } = toolPart
  const translate = useTranslate()

  const swapData = state === 'output-available' && swapOutput ? swapOutput : null
  const { error, steps } = useSwapExecution(toolCallId, state, swapData)

  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const errorColor = useColorModeValue('red.500', 'red.400')

  const completedCount = useMemo(
    () =>
      steps.filter(s => s.status === StepStatus.COMPLETE || s.status === StepStatus.SKIPPED).length,
    [steps],
  )

  const [quoteStep, approvalStep, confirmationStep, swapStep] = steps

  if (!quoteStep || !approvalStep || !confirmationStep || !swapStep) {
    return null
  }

  const hasError = state === 'output-error'
  const isLoading = !swapOutput && !hasError

  const footerMessage = (() => {
    if (state === 'output-error')
      return {
        type: 'error' as const,
        text: translate('agenticChat.agenticChatTools.swap.errors.quoteFailed'),
      }
    if (error)
      return {
        type: 'error' as const,
        text: translate('agenticChat.agenticChatTools.swap.errors.swapFailed', { error }),
      }
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
              {translate('agenticChat.agenticChatTools.swap.receivedFrom', {
                address: middleEllipsis(address),
              })}
            </Text>
          )}
          {summary?.buyAsset?.estimatedValueUSD ? (
            <Amount.Fiat
              value={summary.buyAsset.estimatedValueUSD}
              fontSize='sm'
              color={mutedColor}
              fontWeight='normal'
            />
          ) : isLoading ? (
            <Skeleton height='20px' width='60px' />
          ) : (
            <Text fontSize='sm' color={mutedColor} fontWeight='normal'>
              —
            </Text>
          )}
        </TxStepCard.HeaderRow>
        <Flex
          alignItems='flex-start'
          justifyContent='space-between'
          gap={2}
          flexDirection='column'
          w='full'
        >
          {summary ? (
            <Text fontSize='lg' fontWeight='semibold'>
              {summary.sellAsset.symbol.toUpperCase()} → {summary.buyAsset.symbol.toUpperCase()}
            </Text>
          ) : isLoading ? (
            <Skeleton height='28px' width='120px' />
          ) : (
            <Text fontSize='lg' fontWeight='semibold'>
              {translate('agenticChat.agenticChatTools.swap.title')}
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
        </Flex>
      </TxStepCard.Header>

      <TxStepCard.Stepper completedCount={completedCount} totalCount={4}>
        <TxStepCard.Step status={quoteStep.status} connectorBottom>
          {translate('agenticChat.agenticChatTools.swap.steps.quote')}
        </TxStepCard.Step>
        <TxStepCard.Step status={approvalStep.status} connectorTop connectorBottom>
          {translate('agenticChat.agenticChatTools.swap.steps.approval')}
        </TxStepCard.Step>
        <TxStepCard.Step status={confirmationStep.status} connectorTop connectorBottom>
          {translate('agenticChat.agenticChatTools.swap.steps.approvalConfirmation')}
        </TxStepCard.Step>
        <TxStepCard.Step status={swapStep.status} connectorTop>
          {translate('agenticChat.agenticChatTools.swap.steps.swap')}
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
}
