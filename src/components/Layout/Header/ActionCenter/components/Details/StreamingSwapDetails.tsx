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
  const translate = useTranslate()

  const streamingProgress = useStreamingProgress({ swap })

  const {
    numSuccessfulSwaps: thorchainNumSuccessfulSwaps,
    totalSwapCount: thorchainTotalSwapCount,
    isComplete: isThorchainStreamingComplete,
  } = streamingProgress ?? {}

  const isComplete = isThorchainStreamingComplete || swap.status === SwapStatus.Success

  const totalSwapCount = useMemo(() => {
    return thorchainTotalSwapCount === 0 ? 1 : thorchainTotalSwapCount
  }, [thorchainTotalSwapCount])

  const numSuccessfulSwaps = useMemo(() => {
    if (thorchainNumSuccessfulSwaps === 0 && isComplete) return 1

    return thorchainNumSuccessfulSwaps
  }, [isComplete, thorchainNumSuccessfulSwaps])

  const progress = useMemo(() => {
    return isComplete
      ? 100
      : bnOrZero(numSuccessfulSwaps).div(bnOrZero(totalSwapCount)).multipliedBy(100).toNumber()
  }, [numSuccessfulSwaps, totalSwapCount, isComplete])

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
        />
        <RawText>
          ({numSuccessfulSwaps}/{totalSwapCount})
        </RawText>
      </Row.Value>
    </Row>
  )
}
