import { Progress } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import { SwapStatus } from '@shapeshiftoss/swapper'
import React, { useEffect, useState } from 'react'
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
    const progressInterval = setInterval((): void => {
      console.log('INTERVAL')
      if (swap.status === SwapStatus.Success || estimatedExecutionTimeMs === undefined) {
        setProgress(100)
        return
      }

      const derivedProgress = Math.min(
        Math.round((Date.now() - createdAt) / estimatedExecutionTimeMs),
        100,
      )

      console.log({ derivedProgress, createdAt, estimatedExecutionTimeMs })
      setProgress(derivedProgress)
    }, 1000)

    return () => {
      clearInterval(progressInterval)
    }
  }, [createdAt, estimatedExecutionTimeMs, swap.status])

  const totalMinutes = Math.round((estimatedExecutionTimeMs ?? 0) / 1000 / 60)
  const elapsedMinutes = Math.round((progress / 100) * totalMinutes)

  return (
    <Row fontSize='sm' alignItems='center'>
      <Row.Label>{translate('notificationCenter.bridge.status')}</Row.Label>
      <Row.Value display='flex' alignItems='center' gap={2}>
        <Progress
          width='100px'
          size='xs'
          value={progress}
          colorScheme={isSwapComplete ? 'green' : 'blue'}
          isAnimated={true}
          hasStripe={isSwapComplete ? false : true}
        />
        {translate('notificationCenter.bridge.progress', { totalMinutes, elapsedMinutes })}
      </Row.Value>
    </Row>
  )
}
