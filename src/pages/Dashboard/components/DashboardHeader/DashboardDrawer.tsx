import { Drawer, DrawerContent, DrawerOverlay } from '@chakra-ui/react'
import { memo } from 'react'
import { SideNavContent } from 'components/Layout/Header/SideNavContent'

type DashboardDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export const DashboardDrawer: React.FC<DashboardDrawerProps> = memo(({ isOpen, onClose }) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement='left'>
      <DrawerOverlay />
      <DrawerContent
        paddingTop='env(safe-area-inset-top)'
        paddingBottom='max(1rem, env(safe-area-inset-top))'
        overflowY='auto'
      >
        <SideNavContent onClose={onClose} />
      </DrawerContent>
    </Drawer>
  )
})
