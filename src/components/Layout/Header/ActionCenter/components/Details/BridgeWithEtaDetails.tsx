import { Progress } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import { SwapStatus } from '@shapeshiftoss/swapper'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { Row } from '@/components/Row/Row'

type BridgeWithEtaDetailsProps = {
  swap: Swap
}

export const BridgeWithEtaDetails: React.FC<BridgeWithEtaDetailsProps> = ({ swap }) => {
  const {
    createdAt,
    metadata: { estimatedExecutionTimeMs },
  } = swap

  const [progress, setProgress] = useState(0)

  const translate = useTranslate()

  const isSwapComplete = swap.status === SwapStatus.Success

  useEffect(() => {
    if (isSwapComplete || !estimatedExecutionTimeMs) {
      setProgress(100)
      return
    }

    const progressInterval = setInterval(() => {
      const msSinceCreate = Date.now() - createdAt

      const derivedProgress = Math.min(
        Math.round((msSinceCreate / estimatedExecutionTimeMs) * 100),
        100,
      )

      setProgress(derivedProgress)
    }, 1000)

    return () => {
      clearInterval(progressInterval)
    }
  }, [createdAt, estimatedExecutionTimeMs, isSwapComplete])

  const timeLeft = useMemo(() => {
    const remainingMs = (estimatedExecutionTimeMs ?? 0) * (1 - progress / 100)
    return Math.round(remainingMs / 60000)
  }, [estimatedExecutionTimeMs, progress])

  return (
    <Row fontSize='sm' alignItems='center'>
      <Row.Label>{translate('actionCenter.bridge.status')}</Row.Label>
      <Row.Value display='flex' alignItems='center' gap={2}>
        <Progress
          width='100px'
          size='xs'
          value={progress}
          colorScheme={isSwapComplete ? 'green' : 'blue'}
          isAnimated
          hasStripe={isSwapComplete ? false : true}
        />
        {translate('actionCenter.bridge.progress', { timeLeft })}
      </Row.Value>
    </Row>
  )
}
