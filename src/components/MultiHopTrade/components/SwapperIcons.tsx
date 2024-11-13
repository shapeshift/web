import { Center } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import { AnimatePresence } from 'framer-motion'
import { StreamIcon } from 'components/Icons/Stream'
import { SlideTransitionX } from 'components/SlideTransitionX'

import { SwapperIcon } from './TradeInput/components/SwapperIcon/SwapperIcon'

type SwapperIconsProps = {
  swapSource: SwapSource | undefined
  swapperName: SwapperName | undefined
}

export const SwapperIcons = ({ swapSource, swapperName }: SwapperIconsProps) => {
  const isStreaming =
    swapSource === THORCHAIN_STREAM_SWAP_SOURCE ||
    swapSource === THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE
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
