import { Button, ButtonGroup, Link, Stack } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import React from 'react'
import { useTranslate } from 'react-polyglot'

import { StreamingSwapDetails } from './StreamingSwapDetails'

type SwapDetailsProps = {
  txLink?: string
  swap: Swap
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ txLink, swap }) => {
  const translate = useTranslate()
  const { isStreaming } = swap

  return (
    <Stack gap={4}>
      {isStreaming && <StreamingSwapDetails swap={swap} />}
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
