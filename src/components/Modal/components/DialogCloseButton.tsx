import { CloseIcon } from '@chakra-ui/icons'
import type { ModalCloseButtonProps } from '@chakra-ui/react'
import { IconButton, ModalCloseButton, useMediaQuery } from '@chakra-ui/react'
import { isMobile } from 'react-device-detect'
import { breakpoints } from 'theme/theme'

type DialogCloseButtonProps = ModalCloseButtonProps

const closeIcon = <CloseIcon />

export const DialogCloseButton: React.FC<DialogCloseButtonProps> = ({ children, ...rest }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (isMobile || !isLargerThanMd) {
    return <IconButton size='sm' fontSize='xs' isRound icon={closeIcon} aria-label='close dialog' />
  }
  return <ModalCloseButton position='static' {...rest} />
}
