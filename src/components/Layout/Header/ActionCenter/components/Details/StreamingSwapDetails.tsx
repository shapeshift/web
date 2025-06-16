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
  useStreamingProgress({ swap })
  const translate = useTranslate()
  const {
    attemptedSwapCount,
    totalSwapCount: streamingTotalSwapCount,
    failedSwaps,
  } = swap.metadata.streamingSwapMetadata ?? {}

  const streamingNumSuccessfulSwaps = useMemo(() => {
    return (attemptedSwapCount ?? 0) - (failedSwaps?.length ?? 0)
  }, [attemptedSwapCount, failedSwaps])

  const isSwapStreamingComplete =
    streamingTotalSwapCount !== undefined && streamingNumSuccessfulSwaps >= streamingTotalSwapCount

  const isComplete = isSwapStreamingComplete || swap.status === SwapStatus.Success

  const numSuccessfulSwaps = useMemo(() => {
    if (streamingNumSuccessfulSwaps === 0 && isComplete) return 1

    return streamingNumSuccessfulSwaps
  }, [isComplete, streamingNumSuccessfulSwaps])

  const progress = useMemo(() => {
    return isComplete
      ? 100
      : bnOrZero(numSuccessfulSwaps)
          .div(bnOrZero(streamingTotalSwapCount))
          .multipliedBy(100)
          .toNumber()
  }, [numSuccessfulSwaps, streamingTotalSwapCount, isComplete])

  const maxSwapCount = useMemo(() => {
    if (swap.status === SwapStatus.Success) return numSuccessfulSwaps

    return streamingTotalSwapCount ?? 1
  }, [streamingTotalSwapCount, numSuccessfulSwaps, swap.status])

  if (!swap.isStreaming) return null

  return (
    <Row fontSize='sm'>
      <Row.Label>{translate('notificationCenter.streamingStatus')}</Row.Label>
      <Row.Value display='flex' alignItems='center' gap={2}>
        <Progress
          width='100px'
          size='xs'
          value={progress}
          colorScheme={isComplete ? 'green' : 'blue'}
          isAnimated={true}
          hasStripe={isComplete ? false : true}
        />
        <RawText>
          ({numSuccessfulSwaps}/{maxSwapCount})
        </RawText>
      </Row.Value>
    </Row>
  )
}
