import type { BoxProps } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

const footerContainerPosition: BoxProps['position'] = { base: 'fixed', md: 'relative' }
const footerBg = { base: 'background.surface.base', md: 'transparent' }
export const FooterWrapper: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <Box
      position={footerContainerPosition}
      bottom='env(safe-area-inset-bottom)'
      width='full'
      zIndex='banner'
      bg={footerBg}
    >
      {children}
    </Box>
  )
}
