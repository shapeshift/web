import { SmallCloseIcon } from '@chakra-ui/icons'
import type { ModalCloseButtonProps } from '@chakra-ui/react'
import { IconButton, ModalCloseButton, useMediaQuery } from '@chakra-ui/react'
import { isMobile } from 'react-device-detect'
import { Drawer } from 'vaul'
import { breakpoints } from 'theme/theme'

type DialogCloseButtonProps = ModalCloseButtonProps

const closeIcon = <SmallCloseIcon />

export const DialogCloseButton: React.FC<DialogCloseButtonProps> = ({ children, ...rest }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (isMobile || !isLargerThanMd) {
    return (
      <Drawer.Close>
        <IconButton
          size='sm'
          fontSize='xs'
          variant='ghost'
          isRound
          icon={closeIcon}
          aria-label='close dialog'
        />
      </Drawer.Close>
    )
  }
  return <ModalCloseButton position='static' {...rest} />
}
