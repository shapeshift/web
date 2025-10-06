import { Box, Flex } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

import { ToastCloseButton } from './ToastCloseButton'

type ToastWrapperProps = {
  handleClick: () => void
  onClose: () => void
  bg?: string
} & PropsWithChildren

const toastHoverProps = {
  transform: 'translateY(-2px)',
}

export const ToastWrapper = ({ children, handleClick, onClose, bg }: ToastWrapperProps) => {
  return (
    <Box position='relative' _hover={toastHoverProps} transition='all 0.2s'>
      <Flex
        onClick={handleClick}
        cursor='pointer'
        p={4}
        alignItems='center'
        boxShadow='lg'
        width='100%'
        bg={bg ?? 'background.surface.overlay.base'}
        borderRadius='20'
        position='relative'
      >
        {children}
        <ToastCloseButton onClose={onClose} />
      </Flex>
    </Box>
  )
}
