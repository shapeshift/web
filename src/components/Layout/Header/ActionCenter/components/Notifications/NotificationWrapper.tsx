import { Box, Flex } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

import { ToastCloseButton } from './ToastCloseButton'

type NotificationWrapperProps = {
  handleClick: () => void
  onClose: () => void
} & PropsWithChildren

const toastHoverProps = {
  transform: 'translateY(-2px)',
}

export const NotificationWrapper = ({
  children,
  handleClick,
  onClose,
}: NotificationWrapperProps) => {
  return (
    <Box position='relative' _hover={toastHoverProps} transition='all 0.2s'>
      <Flex
        onClick={handleClick}
        cursor='pointer'
        p={4}
        alignItems='center'
        boxShadow='lg'
        width='100%'
        bg='background.surface.overlay.base'
        borderRadius='20'
        position='relative'
      >
        {children}
        <ToastCloseButton onClose={onClose} />
      </Flex>
    </Box>
  )
}
