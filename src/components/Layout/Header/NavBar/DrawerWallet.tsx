import { Drawer, DrawerContent, DrawerOverlay } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

import { DrawerSettings } from './DrawerSettings'
import { DrawerWalletDashboard } from './DrawerWalletDashboard'

import { ManageHiddenAssetsContent } from '@/components/ManageHiddenAssets/ManageHiddenAssetsContent'
import { SettingsRoutes } from '@/components/Modals/Settings/SettingsCommon'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { useModal } from '@/hooks/useModal/useModal'

const initialEntries = ['/', ...Object.values(SettingsRoutes)]

type DrawerWalletInnerProps = {
  onClose: () => void
  isOpen: boolean
}

export const DrawerWalletInner: FC<DrawerWalletInnerProps> = memo(({ onClose, isOpen }) => {
  const navigate = useNavigate()

  const handleSettingsClick = useCallback(() => {
    navigate(SettingsRoutes.Index)
  }, [navigate])

  const handleBackToMain = useCallback(() => {
    navigate('/')
  }, [navigate])

  const drawerSettingsElement = useMemo(
    () => <DrawerSettings onBack={handleBackToMain} onClose={onClose} />,
    [handleBackToMain, onClose],
  )

  const manageHiddenAssetsElement = useMemo(() => <ManageHiddenAssetsContent />, [])

  const drawerWalletDashboardElement = useMemo(
    () => (
      <DrawerWalletDashboard
        isOpen={isOpen}
        onClose={onClose}
        onSettingsClick={handleSettingsClick}
      />
    ),
    [onClose, handleSettingsClick, isOpen],
  )

  return (
    <Routes>
      <Route path='/' element={drawerWalletDashboardElement} />
      <Route path='/manage-hidden-assets' element={manageHiddenAssetsElement} />
      <Route path='/settings/*' element={drawerSettingsElement} />
    </Routes>
  )
})

export const DrawerWallet: FC = memo(() => {
  const { isOpen, close: onClose } = useModal('walletDrawer')
  const { modalContentProps, overlayProps, modalProps } = useModalRegistration({
    isOpen,
    onClose,
  })

  return (
    <Drawer placement='right' size='sm' {...modalProps}>
      <DrawerOverlay {...overlayProps} />
      <DrawerContent width='full' maxWidth='512px' {...modalContentProps}>
        <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
          <DrawerWalletInner onClose={onClose} isOpen={isOpen} />
        </MemoryRouter>
      </DrawerContent>
    </Drawer>
  )
})
