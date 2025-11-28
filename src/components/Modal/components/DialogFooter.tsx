import type { FlexProps } from '@chakra-ui/react'
import { Flex, ModalFooter, useMediaQuery } from '@chakra-ui/react'
import { isMobile } from 'react-device-detect'

import { breakpoints } from '@/theme/theme'

type DialogFooterProps = FlexProps

export const DialogFooter: React.FC<DialogFooterProps> = props => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (isMobile || !isLargerThanMd) {
    return <Flex px={4} alignItems='center' mt='auto' {...props} />
  }
  return <ModalFooter {...props} />
}
