import type { BoxProps } from '@chakra-ui/react'
import { Box, ModalBody, useMediaQuery } from '@chakra-ui/react'
import { isMobile } from 'react-device-detect'
import { breakpoints } from 'theme/theme'

type DialogBodyProps = BoxProps

export const DialogBody: React.FC<DialogBodyProps> = ({ children, ...rest }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (isMobile || !isLargerThanMd) {
    return (
      <Box px={4} overflowY='auto' {...rest}>
        {children}
      </Box>
    )
  }
  return <ModalBody {...rest}>{children}</ModalBody>
}
