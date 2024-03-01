import type { FlexProps } from '@chakra-ui/react'
import { Flex, ModalFooter, useMediaQuery } from '@chakra-ui/react'
import { isMobile } from 'react-device-detect'
import { breakpoints } from 'theme/theme'

type DialogFooterProps = FlexProps

export const DialogFooter: React.FC<DialogFooterProps> = props => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (isMobile || !isLargerThanMd) {
    return (
      <Flex
        px={4}
        pb='calc(env(safe-area-inset-bottom) + 1rem)'
        alignItems='center'
        mt={6}
        {...props}
      />
    )
  }
  return <ModalFooter {...props} />
}
