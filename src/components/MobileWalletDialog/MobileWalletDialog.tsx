import {
  Box,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { CreateWalletRouter } from './routes/CreateWallet/CreateWalletRouter'
import { DeleteWallet } from './routes/DeleteWallet/DeleteWallet'
import { ImportRouter } from './routes/ImportWallet/ImportRouter'
import { ManualBackup } from './routes/ManualBackup/ManualBackup'
import { RenameWallet } from './routes/RenameWallet'
import { SavedWallets } from './routes/SavedWallets'
import { MobileWalletDialogRoutes } from './types'

import { SlideTransition } from '@/components/SlideTransition'

interface DialogProps {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  height?: string
  isDisablingPropagation?: boolean
}

// Basic Dialog component with framer-motion transitions baked in
const Dialog = ({ children, isOpen, onClose }: DialogProps) => (
  <Modal isOpen={isOpen} onClose={onClose} isCentered trapFocus={false}>
    <ModalOverlay />
    <SlideTransition>
      <ModalContent>{children}</ModalContent>
    </SlideTransition>
  </Modal>
)

interface MobileWalletDialogProps {
  isOpen: boolean
  onClose: () => void
  defaultRoute?: MobileWalletDialogRoutes
}

export const MobileWalletDialog = ({
  isOpen,
  onClose,
  defaultRoute = MobileWalletDialogRoutes.Saved,
}: MobileWalletDialogProps) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto' isDisablingPropagation={false}>
      <MemoryRouter>
        <AnimatePresence mode='wait' initial={false}>
          <AnimatedRoutes defaultRoute={defaultRoute} onClose={onClose} />
        </AnimatePresence>
      </MemoryRouter>
    </Dialog>
  )
}

interface AnimatedRoutesProps {
  defaultRoute: MobileWalletDialogRoutes
  onClose: () => void
}

const AnimatedRoutes = ({ defaultRoute, onClose }: AnimatedRoutesProps) => {
  const location = useLocation()

  return (
    <Routes location={location} key={location.key}>
      <Route
        path={MobileWalletDialogRoutes.Backup}
        element={<ManualBackup showContinueButton={false} />}
      />
      <Route
        path={MobileWalletDialogRoutes.Import}
        element={<ImportRouter onClose={onClose} defaultRoute={defaultRoute} />}
      />
      <Route path={MobileWalletDialogRoutes.Saved} element={<SavedWallets onClose={onClose} />} />
      <Route path={MobileWalletDialogRoutes.Rename} element={<RenameWallet />} />
      <Route path={MobileWalletDialogRoutes.Delete} element={<DeleteWallet />} />
      <Route
        path={MobileWalletDialogRoutes.Create}
        element={<CreateWalletRouter onClose={onClose} defaultRoute={defaultRoute} />}
      />
      <Route path='/' element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  )
}
