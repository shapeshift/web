import { Drawer, DrawerCloseButton, DrawerContent, DrawerOverlay } from '@chakra-ui/react'

import { useModalRegistration } from '@/context/ModalStackProvider'

export type DrawerWrapperProps = {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  variant?: string
}

// This prevents manage accounts modal from blocking pointer events here when it's open
const overrideStyles = { pointerEvents: 'auto' as const }

export const DrawerWrapper = ({ children, isOpen, onClose, variant }: DrawerWrapperProps) => {
  const { modalStyle, overlayStyle, isHighestModal } = useModalRegistration({
    isOpen,
    modalId: 'manage-accounts-drawer',
  })
  return (
    <Drawer
      isOpen={isOpen}
      size='lg'
      placement='right'
      onClose={onClose}
      variant={variant}
      trapFocus={isHighestModal}
      blockScrollOnMount={isHighestModal}
    >
      <DrawerOverlay zIndex='modal' style={overrideStyles} {...overlayStyle} />
      <DrawerContent style={overrideStyles} containerProps={modalStyle}>
        <DrawerCloseButton top='calc(env(safe-area-inset-top) + var(--safe-area-inset-top) + 1rem)' />
        {children}
      </DrawerContent>
    </Drawer>
  )
}
