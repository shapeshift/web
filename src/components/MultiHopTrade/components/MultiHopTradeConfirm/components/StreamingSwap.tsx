import { WarningIcon } from '@chakra-ui/icons'
import { Progress, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'

import { useMockThorStreamingProgress } from '../hooks/mockHooks'

export type StreamingSwapProps = {
  sellTxHash: string | undefined
}

export const StreamingSwap = (props: StreamingSwapProps) => {
  const { sellTxHash } = props

  const translate = useTranslate()

  const {
    attemptedSwapCount,
    progressProps: thorStreamingSwapProgressProps,
    totalSwapCount,
    failedSwaps,
  } = useMockThorStreamingProgress(sellTxHash, true)

  return (
    <Stack px={4}>
      <Row>
        <Row.Label>{translate('trade.streamStatus')}</Row.Label>
        {totalSwapCount > 0 && (
          <Row.Value>{`${attemptedSwapCount} of ${totalSwapCount}`}</Row.Value>
        )}
      </Row>
      <Row>
        <Progress width='full' borderRadius='full' size='sm' {...thorStreamingSwapProgressProps} />
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
