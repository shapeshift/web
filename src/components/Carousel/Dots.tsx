import { Box, Circle } from '@chakra-ui/react'

import type { DotProps } from './types'

export const Dots = ({ length, activeIndex, setActiveIndex }: DotProps) => {
  return (
    <Box
      position='absolute'
      bottom='10px'
      left='50%'
      transform='translateX(-50%)'
      display='flex'
      gap={2}
    >
      {new Array(length).fill('').map((_, i) => (
        <Circle
          onClick={() => setActiveIndex(i)}
          key={i}
          display='inline-block'
          as='span'
          size='10px'
          bg={i === activeIndex ? 'white' : 'whiteAlpha.100'}
        />
      ))}
    </Box>
  )
}
