import { Button, ButtonGroup, Link, Progress, Stack } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import { SwapStatus } from '@shapeshiftoss/swapper'
import React, { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useStreamingProgress } from '@/components/MultiHopTrade/components/TradeConfirm/hooks/useStreamingProgress'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'

type SwapDetailsProps = {
  txLink?: string
  swap: Swap
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ txLink, swap }) => {
  const translate = useTranslate()
  const { isStreaming } = swap

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

  return (
    <Stack gap={4}>
      {isStreaming && (
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
      )}
      {txLink && (
        <ButtonGroup width='full' size='sm'>
          <Button width='full' as={Link} isExternal href={txLink}>
            {translate('notificationCenter.viewTransaction')}
          </Button>
        </ButtonGroup>
      )}
    </Stack>
  )
}
