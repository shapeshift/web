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

  const { maxSwapCount: streamingTotalSwapCount, attemptedSwapCount } = streamingSwapData ?? {}

  const translate = useTranslate()

  const isSwapComplete = swap.status === SwapStatus.Success

  const progress = useMemo(() => {
    if (isSwapComplete) return 100
    if (streamingTotalSwapCount === undefined) return 0

    return bnOrZero(attemptedSwapCount)
      .div(bnOrZero(streamingTotalSwapCount))
      .multipliedBy(100)
      .toNumber()
  }, [attemptedSwapCount, streamingTotalSwapCount, isSwapComplete])

  const maxSwapCount = useMemo(() => {
    if (streamingTotalSwapCount === 1) return
    if (swap.status === SwapStatus.Success) return attemptedSwapCount

    return streamingTotalSwapCount
  }, [streamingTotalSwapCount, attemptedSwapCount, swap.status])

  if (!swap.isStreaming) return null

  return (
    <Row fontSize='sm' alignItems='center'>
      <Row.Label>{translate('actionCenter.streamingStatus')}</Row.Label>
      <Row.Value display='flex' alignItems='center' gap={2}>
        <Progress
          width='100px'
          size='xs'
          value={progress}
          colorScheme={isSwapComplete ? 'green' : 'blue'}
          isAnimated={true}
          hasStripe={isSwapComplete ? false : true}
        />
        {maxSwapCount !== undefined ? (
          <RawText>
            ({attemptedSwapCount}/{maxSwapCount})
          </RawText>
        ) : null}
      </Row.Value>
    </Row>
  )
}
