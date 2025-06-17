import { Progress } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import { SwapStatus } from '@shapeshiftoss/swapper'
import React, { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useStreamingProgress } from '@/components/MultiHopTrade/components/TradeConfirm/hooks/useStreamingProgress'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'

type StreamingSwapDetailsProps = {
  swap: Swap
}

export const StreamingSwapDetails: React.FC<StreamingSwapDetailsProps> = ({ swap }) => {
  const streamingSwapData = useStreamingProgress({ swap })

  const { totalSwapCount: streamingTotalSwapCount, successfulSwapCount } = streamingSwapData ?? {}

  const translate = useTranslate()

  const isSwapComplete = swap.status === SwapStatus.Success

  const progress = useMemo(() => {
    return isSwapComplete
      ? 100
      : bnOrZero(successfulSwapCount)
          .div(bnOrZero(streamingTotalSwapCount))
          .multipliedBy(100)
          .toNumber()
  }, [successfulSwapCount, streamingTotalSwapCount, isSwapComplete])

  const maxSwapCount = useMemo(() => {
    if (swap.status === SwapStatus.Success) return successfulSwapCount

    return streamingTotalSwapCount ?? 1
  }, [streamingTotalSwapCount, successfulSwapCount, swap.status])

  if (!swap.isStreaming) return null

  return (
    <Row fontSize='sm'>
      <Row.Label>{translate('notificationCenter.streamingStatus')}</Row.Label>
      <Row.Value display='flex' alignItems='center' gap={2}>
        <Progress
          width='100px'
          size='xs'
          value={progress}
          colorScheme={isSwapComplete ? 'green' : 'blue'}
          isAnimated={true}
          hasStripe={isSwapComplete ? false : true}
        />
        <RawText>
          ({successfulSwapCount}/{maxSwapCount})
        </RawText>
      </Row.Value>
    </Row>
  )
}
