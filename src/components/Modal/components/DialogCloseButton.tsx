import type { ModalCloseButtonProps } from '@chakra-ui/react'
import { IconButton, ModalCloseButton, useMediaQuery } from '@chakra-ui/react'
import { useCallback } from 'react'
import { IoClose } from 'react-icons/io5'
import { Drawer } from 'vaul'
import { useDialog } from 'context/DialogContextProvider/DialogContextProvider'
import { isMobile } from 'lib/globals'
import { breakpoints } from 'theme/theme'

type DialogCloseButtonProps = ModalCloseButtonProps

const closeIcon = <IoClose />

export const DialogCloseButton: React.FC<DialogCloseButtonProps> = ({ children, ...rest }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { setIsOpen, isOpen } = useDialog()

  const handleCloseClick = useCallback(() => {
    setIsOpen(!isOpen)
  }, [isOpen, setIsOpen])

  if (isMobile || !isLargerThanMd) {
    return (
      <Drawer.Close>
        <IconButton
          fontSize='2xl'
          variant='ghost'
          isRound
          icon={closeIcon}
          aria-label='close dialog'
          onClick={handleCloseClick}
        />
      </Drawer.Close>
    )
  }
  return <ModalCloseButton size='md' position='static' {...rest} />
}
