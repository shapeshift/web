import { Box, Circle } from '@chakra-ui/react'
import { useMemo } from 'react'

import type { DotProps } from './types'

export const Dots = ({ length, activeIndex, setActiveIndex }: DotProps) => {
  const renderDots = useMemo(() => {
    return new Array(length)
      .fill('')
      .map((_, i) => (
        <Circle
          onClick={() => setActiveIndex(i)}
          key={i}
          display='inline-block'
          as='span'
          size='10px'
          bg={i === activeIndex ? 'white' : 'whiteAlpha.100'}
        />
      ))
  }, [activeIndex, length, setActiveIndex])
  return (
    <Box display='flex' gap={2}>
      {renderDots}
    </Box>
  )
}
