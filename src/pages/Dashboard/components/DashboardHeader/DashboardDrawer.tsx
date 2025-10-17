import { Drawer, DrawerContent, DrawerOverlay } from '@chakra-ui/react'
import { memo } from 'react'

import { SideNavContent } from '@/components/Layout/Header/SideNavContent'
import { useModalRegistration } from '@/context/ModalStackProvider'

type DashboardDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export const DashboardDrawer: React.FC<DashboardDrawerProps> = memo(({ isOpen, onClose }) => {
  const { modalContentProps, overlayProps, modalProps } = useModalRegistration({
    isOpen,
    onClose,
  })
  return (
    <Drawer {...modalProps} placement='left'>
      <DrawerOverlay {...overlayProps} />
      <DrawerContent
        paddingTop='calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'
        paddingBottom='max(1rem, calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'
        overflowY='auto'
        {...modalContentProps}
      >
        <SideNavContent onClose={onClose} />
      </DrawerContent>
    </Drawer>
  )
})
