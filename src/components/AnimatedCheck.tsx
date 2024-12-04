import type { BoxProps } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useMemo } from 'react'

export const AnimatedCheck = ({
  defaultDuration = 1000,
  boxSize = 24,
  color = 'green.500',
}: {
  defaultDuration?: number
  boxSize?: BoxProps['boxSize']
  color?: BoxProps['color']
}) => {
  const placeholderDuration = useMemo(() => defaultDuration / 1000 + 2, [defaultDuration])

  const draw = useMemo(() => {
    const drawDelay = placeholderDuration / 1.5 > 10 ? 5 : placeholderDuration / 1.5
    return {
      hidden: { pathLength: 0, opacity: 0 },
      visible: () => ({
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: {
            delay: drawDelay,
            type: 'spring',
            duration: 2,
            bounce: 0,
          },
          opacity: { delay: drawDelay, duration: 2 },
        },
      }),
    }
  }, [placeholderDuration])

  const border = useMemo(() => {
    return {
      hidden: { pathLength: 0 },
      visible: () => ({
        pathLength: 1,
        transition: {
          pathLength: {
            type: 'spring',
            duration: placeholderDuration > 10 ? 10 : placeholderDuration,
            bounce: 0,
          },
        },
      }),
    }
  }, [placeholderDuration])

  return (
    <Box boxSize={boxSize} color={color}>
      <motion.svg
        xmlns='http://www.w3.org/2000/svg'
        width='100%'
        height='100%'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
        initial='hidden'
        animate='visible'
      >
        {/* Outer circle */}
        <motion.path d='M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' variants={border} />

        {/* Checkmark */}
        <motion.path d='M9 12l2 2l4 -4' variants={draw} />
      </motion.svg>
    </Box>
  )
}
