import { WarningIcon } from '@chakra-ui/icons'
import { Progress, Stack } from '@chakra-ui/react'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import type { StreamingSwapFailedSwap } from 'state/slices/tradeQuoteSlice/types'

export type StreamingSwapProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  activeTradeId: TradeQuote['id']
  useStreamingProgress: (input: {
    tradeQuoteStep?: TradeQuoteStep
    hopIndex: number
    confirmedTradeId: TradeQuote['id']
  }) => {
    isComplete: boolean
    attemptedSwapCount: number
    totalSwapCount: number
    failedSwaps: StreamingSwapFailedSwap[]
  }
}

export const StreamingSwap = (props: StreamingSwapProps) => {
  const { tradeQuoteStep, hopIndex, activeTradeId, useStreamingProgress } = props

  const translate = useTranslate()

  const { totalSwapCount, attemptedSwapCount, isComplete, failedSwaps } = useStreamingProgress({
    tradeQuoteStep,
    hopIndex,
    confirmedTradeId: activeTradeId,
  })

  const isInitializing = useMemo(() => {
    return !isComplete && totalSwapCount === 0
  }, [isComplete, totalSwapCount])

  return (
    <Stack px={4}>
      <Row>
        <Row.Label>{translate('trade.streamStatus')}</Row.Label>
        {totalSwapCount > 0 && (
          <Row.Value>{`${attemptedSwapCount} of ${totalSwapCount}`}</Row.Value>
        )}
      </Row>
      <Row>
        <Progress
          width='full'
          borderRadius='full'
          size='sm'
          min={0}
          max={totalSwapCount}
          value={attemptedSwapCount}
          hasStripe={isInitializing}
          isAnimated={!isComplete}
          colorScheme={isComplete ? 'green' : 'blue'}
        />
      </Row>
      {failedSwaps.length > 0 && (
        <Row>
          <Row.Value display='flex' alignItems='center' gap={1} color='text.warning'>
            <WarningIcon />
            {translate('trade.swapsFailed', { failedSwaps: failedSwaps.length })}
          </Row.Value>
          {/* TODO: provide details of streaming swap failures - needs details modal
            <Row.Value>
              <Button variant='link' colorScheme='blue' fontSize='sm'>
                {translate('common.learnMore')}
              </Button>
            </Row.Value>
          */}
        </Row>
      )}
    </Stack>
  )
}
