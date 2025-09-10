import { Box, Center } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import {
  MAYACHAIN_STREAM_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { TbWifi } from 'react-icons/tb'

import { SwapperIcon } from './TradeInput/components/SwapperIcon/SwapperIcon'

type SwapperIconsProps = {
  swapSource: SwapSource | undefined
  swapperName: SwapperName | undefined
}

export const SwapperIcons = ({ swapSource, swapperName }: SwapperIconsProps) => {
  const isStreaming =
    swapSource === THORCHAIN_STREAM_SWAP_SOURCE ||
    swapSource === THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE ||
    swapSource === MAYACHAIN_STREAM_SWAP_SOURCE

  const animationTransition = useMemo(
    () => ({ duration: 0.2, ease: [0.43, 0.13, 0.23, 0.96] as [number, number, number, number] }),
    [],
  )

  const widthAnimate = useMemo(
    () =>
      isStreaming
        ? { width: 24, transition: animationTransition }
        : { width: 0, transition: animationTransition },
    [animationTransition, isStreaming],
  )

  const streamingAnimate = useMemo(
    () =>
      isStreaming
        ? { opacity: 1, scale: 1, transition: animationTransition }
        : { opacity: 0, scale: 0.85, transition: animationTransition },
    [animationTransition, isStreaming],
  )

  const swapperInitial = useMemo(() => ({ opacity: 0, scale: 0.9 }), [])
  const swapperAnimate = useMemo(
    () => ({ opacity: 1, scale: 1, transition: animationTransition }),
    [animationTransition],
  )
  const swapperExit = useMemo(
    () => ({ opacity: 0, scale: 1.05, transition: animationTransition }),
    [animationTransition],
  )
  const overlayStyle = useMemo(
    () =>
      ({
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }) as const,
    [],
  )

  const widthWillChangeStyle = useMemo(() => ({ willChange: 'width' }) as const, [])
  const opacityTransformWillChangeStyle = useMemo(
    () => ({ willChange: 'opacity, transform' }) as const,
    [],
  )

  return (
    <Box as={motion.div} display='inline-flex' alignItems='center'>
      <Box
        as={motion.div}
        initial={false}
        animate={widthAnimate}
        overflow='hidden'
        display='inline-flex'
        style={widthWillChangeStyle}
      >
        <Box
          as={motion.div}
          initial={false}
          animate={streamingAnimate}
          display='inline-flex'
          style={opacityTransformWillChangeStyle}
        >
          <Center
            className='quote-icon'
            bg='background.surface.raised.base'
            borderRadius='md'
            borderWidth={1}
            p='2px'
            borderColor='border.base'
            boxShadow='0 1px 2px rgba(0,0,0,.2)'
          >
            <Box color='purple.500'>
              <TbWifi />
            </Box>
          </Center>
        </Box>
      </Box>
      <Center
        className='quote-icon'
        bg='background.surface.raised.base'
        borderRadius='md'
        borderWidth={1}
        p='2px'
        borderColor='border.base'
        boxShadow='0 1px 2px rgba(0,0,0,.2)'
      >
        <Box position='relative' display='inline-flex'>
          <Box visibility='hidden'>
            {swapperName && <SwapperIcon size='2xs' swapperName={swapperName} />}
          </Box>
          <AnimatePresence initial={false}>
            <motion.div
              key={swapperName ?? 'unknown'}
              initial={swapperInitial}
              animate={swapperAnimate}
              exit={swapperExit}
              style={overlayStyle}
            >
              {swapperName && <SwapperIcon size='2xs' swapperName={swapperName} />}
            </motion.div>
          </AnimatePresence>
        </Box>
      </Center>
    </Box>
  )
}
