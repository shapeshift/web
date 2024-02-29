import type { BoxProps } from '@chakra-ui/react'
import { Box, ModalBody, useMediaQuery } from '@chakra-ui/react'
import { isMobile } from 'react-device-detect'
import Sheet from 'react-modal-sheet'
import { breakpoints } from 'theme/theme'

type DialogBodyProps = BoxProps

export const DialogBody: React.FC<DialogBodyProps> = ({ children, ...rest }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (isMobile || !isLargerThanMd) {
    return (
      <Sheet.Content>
        <Box px={4} {...rest}>
          {children}
        </Box>
      </Sheet.Content>
    )
  }
  return <ModalBody {...rest}>{children}</ModalBody>
}
