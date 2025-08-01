import { Drawer, DrawerCloseButton, DrawerContent, DrawerOverlay } from '@chakra-ui/react'

export type DrawerWrapperProps = {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  variant?: string
}

// This prevents manage accounts modal from blocking pointer events here when it's open
const overrideStyles = { pointerEvents: 'auto' as const }

export const DrawerWrapper = ({ children, isOpen, onClose, variant }: DrawerWrapperProps) => {
  return (
    <Drawer isOpen={isOpen} size='lg' placement='right' onClose={onClose} variant={variant}>
      <DrawerOverlay zIndex='modal' style={overrideStyles} />
      <DrawerContent style={overrideStyles}>
        <DrawerCloseButton top='calc(env(safe-area-inset-top) + var(--safe-area-inset-top) + 1rem)' />
        {children}
      </DrawerContent>
    </Drawer>
  )
}
