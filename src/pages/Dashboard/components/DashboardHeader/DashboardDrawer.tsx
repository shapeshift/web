import { Drawer, DrawerContent, DrawerOverlay } from '@chakra-ui/react'
import { memo } from 'react'

import { SideNavContent } from '@/components/Layout/Header/SideNavContent'
import { useModalRegistration } from '@/context/ModalStackProvider'

type DashboardDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export const DashboardDrawer: React.FC<DashboardDrawerProps> = memo(({ isOpen, onClose }) => {
  const { modalStyle, overlayStyle } = useModalRegistration({
    isOpen,
    modalId: 'dashboard-drawer',
  })
  return (
    <Drawer isOpen={isOpen} onClose={onClose} blockScrollOnMount={false} placement='left'>
      <DrawerOverlay {...overlayStyle} />
      <DrawerContent
        paddingTop='calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'
        paddingBottom='max(1rem, calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'
        overflowY='auto'
        containerProps={modalStyle}
      >
        <SideNavContent onClose={onClose} />
      </DrawerContent>
    </Drawer>
  )
})
