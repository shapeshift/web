import type { BoxProps } from '@chakra-ui/react'
import { ModalHeader, SimpleGrid, useMediaQuery } from '@chakra-ui/react'
import { isMobile } from 'react-device-detect'
import { breakpoints } from 'theme/theme'

type DialogHeaderProps = BoxProps

export const DialogHeader: React.FC<DialogHeaderProps> = props => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (isMobile || !isLargerThanMd) {
    return <SimpleGrid gridTemplateColumns='44px 1fr 44px' fontWeight='bold' pb={4} {...props} />
  }
  return <ModalHeader {...props} />
}
