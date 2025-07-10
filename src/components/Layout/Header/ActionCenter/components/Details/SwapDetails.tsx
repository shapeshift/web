import { Button, ButtonGroup, Link, Stack } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import React from 'react'
import { useTranslate } from 'react-polyglot'

import { BridgeWithEtaDetails } from './BridgeWithEtaDetails'
import { StreamingSwapDetails } from './StreamingSwapDetails'

import { SwapDisplayType } from '@/state/slices/actionSlice/types'

type SwapDetailsProps = {
  txLink?: string
  swap: Swap
  displayType: SwapDisplayType
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ txLink, swap, displayType }) => {
  const translate = useTranslate()
  const { isStreaming } = swap

  return (
    <Stack gap={4}>
      {isStreaming && <StreamingSwapDetails swap={swap} />}
      {displayType === SwapDisplayType.Bridge && <BridgeWithEtaDetails swap={swap} />}
      {txLink && (
        <ButtonGroup width='full' size='sm'>
          <Button width='full' as={Link} isExternal href={txLink}>
            {translate('actionCenter.viewTransaction')}
          </Button>
        </ButtonGroup>
      )}
    </Stack>
  )
}
