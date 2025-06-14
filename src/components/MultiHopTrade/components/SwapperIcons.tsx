import { Center } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import {
  MAYACHAIN_STREAM_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper'
import { AnimatePresence } from 'framer-motion'

import { SwapperIcon } from './TradeInput/components/SwapperIcon/SwapperIcon'

import { StreamIcon } from '@/components/Icons/Stream'
import { SlideTransitionX } from '@/components/SlideTransitionX'

type SwapperIconsProps = {
  swapSource: SwapSource | undefined
  swapperName: SwapperName | undefined
}

export const SwapperIcons = ({ swapSource, swapperName }: SwapperIconsProps) => {
  const isStreaming =
    swapSource === THORCHAIN_STREAM_SWAP_SOURCE ||
    swapSource === THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE ||
    swapSource === MAYACHAIN_STREAM_SWAP_SOURCE

  return (
    <AnimatePresence>
      {isStreaming && (
        <SlideTransitionX key={swapSource ?? swapperName}>
          <Center
            className='quote-icon'
            bg='background.surface.raised.base'
            borderRadius='md'
            borderWidth={1}
            p='2px'
            borderColor='border.base'
            boxShadow='0 1px 2px rgba(0,0,0,.2)'
          >
            <StreamIcon color='text.success' />
          </Center>
        </SlideTransitionX>
      )}
      <Center
        className='quote-icon'
        bg='background.surface.raised.base'
        borderRadius='md'
        borderWidth={1}
        p='2px'
        borderColor='border.base'
        boxShadow='0 1px 2px rgba(0,0,0,.2)'
      >
        {swapperName && <SwapperIcon size='2xs' swapperName={swapperName} />}
      </Center>
    </AnimatePresence>
  )
}
