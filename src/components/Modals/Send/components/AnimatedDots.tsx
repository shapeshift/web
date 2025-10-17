import { Box, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'

import { breakpoints } from '@/theme/theme'

// Infinite scroll animation that moves dots down continuously
const infiniteScroll = keyframes`
  0% {
    transform: translateY(10px);
  }
  100% {
    transform: translateY(90px);
  }
`

const INFINITE_SCROLL_AMOUNT_SECONDS = 5

const dotPositions = [-75, -55, -35, -15, 5, 25, 45, 65]

export const AnimatedDots = () => {
  const shadowColor = useColorModeValue('#f8fafc', '#1e2024')
  const desktopShadowColor = useColorModeValue('#f8fafc', '#323232')
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  return (
    <Box
      position='relative'
      height='60px'
      width='20px'
      overflow='hidden'
      display='flex'
      flexDirection='column'
      alignItems='center'
      justifyContent='center'
      zIndex={0}
    >
      <Box
        position='absolute'
        top='-10px'
        left='0'
        right='0'
        height='30px'
        background={`linear-gradient(to bottom, ${
          isSmallerThanMd ? shadowColor : desktopShadowColor
        } 0%, ${isSmallerThanMd ? shadowColor : desktopShadowColor}80 70%, transparent 100%)`}
        zIndex={2}
        pointerEvents='none'
      />

      <Box
        position='absolute'
        bottom='-10px'
        left='0'
        right='0'
        height='30px'
        background={`linear-gradient(to top, ${
          isSmallerThanMd ? shadowColor : desktopShadowColor
        } 0%, ${isSmallerThanMd ? shadowColor : desktopShadowColor}80 70%, transparent 100%)`}
        zIndex={2}
        pointerEvents='none'
      />
      {dotPositions.map((topPosition, index) => {
        return (
          <Box
            key={index}
            position='absolute'
            width='6px'
            height='6px'
            bg='text.subtle'
            borderRadius='full'
            zIndex={1}
            left='50%'
            marginLeft='-3px'
            top={`${topPosition}px`}
            animation={`${infiniteScroll} ${INFINITE_SCROLL_AMOUNT_SECONDS}s infinite linear`}
          />
        )
      })}
    </Box>
  )
}
