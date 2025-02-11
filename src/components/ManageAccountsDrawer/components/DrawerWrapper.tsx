import { Drawer, DrawerCloseButton, DrawerContent, DrawerOverlay } from '@chakra-ui/react'

export type DrawerWrapperProps = {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  variant?: string
}

export const DrawerWrapper = ({ children, isOpen, onClose, variant }: DrawerWrapperProps) => {
  return (
    <Drawer isOpen={isOpen} size='lg' placement='right' onClose={onClose} variant={variant}>
      <DrawerOverlay zIndex='modal' />
      <DrawerContent>
        <DrawerCloseButton top='calc(env(safe-area-inset-top) + 1rem)' />
        {children}
      </DrawerContent>
    </Drawer>
  )
}
