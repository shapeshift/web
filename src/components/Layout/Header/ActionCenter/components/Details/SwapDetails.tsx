import { Button, ButtonGroup, Link, Stack } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import React from 'react'
import { useTranslate } from 'react-polyglot'

import { BridgeWithEtaDetails } from './BridgeWithEtaDetails'
import { StreamingSwapDetails } from './StreamingSwapDetails'

type SwapDetailsProps = {
  txLink?: string
  swap: Swap
  isBridgeWithEta: boolean
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ txLink, swap, isBridgeWithEta }) => {
  const translate = useTranslate()
  const { isStreaming } = swap

  return (
    <Stack gap={4}>
      {isStreaming && <StreamingSwapDetails swap={swap} />}
      {isBridgeWithEta && !isStreaming && <BridgeWithEtaDetails swap={swap} />}
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
