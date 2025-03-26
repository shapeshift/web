import { AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import { MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { ManualBackup } from '../ManualBackup/ManualBackup'
import { CreateBackupConfirm } from './CreateBackupConfirm'
import { CreateSuccess } from './CreateSuccess'
import { CreateWallet } from './CreateWallet'
import { KeepSafe } from './KeepSafe'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { SlideTransition } from '@/components/SlideTransition'

type CreateWalletRouterProps = {
  onClose: () => void
  defaultRoute: MobileWalletDialogRoutes
}

export const CreateWalletRouter = ({ onClose, defaultRoute }: CreateWalletRouterProps) => {
  return (
    <SlideTransition>
      <MemoryRouter>
        <AnimatePresence mode='wait' initial={false}>
          <CreateWalletRoutes onClose={onClose} defaultRoute={defaultRoute} />
        </AnimatePresence>
      </MemoryRouter>
    </SlideTransition>
  )
}

const CreateWalletRoutes = ({ onClose, defaultRoute }: CreateWalletRouterProps) => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleRedirectToHome = useCallback(() => {
    navigate(MobileWalletDialogRoutes.Saved)
  }, [navigate])

  return (
    <Routes location={location}>
      <Route path={MobileWalletDialogRoutes.CreateBackupSuccess} element={<CreateSuccess onClose={onClose} />} />
      <Route path={MobileWalletDialogRoutes.CreateBackupConfirm} element={<CreateBackupConfirm />} />
      <Route path={MobileWalletDialogRoutes.CreateBackup} element={<ManualBackup />} />
      <Route path={MobileWalletDialogRoutes.KeepSafe} element={<KeepSafe />} />
      <Route 
        path={MobileWalletDialogRoutes.Create} 
        element={
          <CreateWallet
            isDefaultRoute={defaultRoute === MobileWalletDialogRoutes.Create}
            onClose={onClose}
            handleRedirectToHome={handleRedirectToHome}
          />
        } 
      />
      <Route path='/' element={<Navigate to={MobileWalletDialogRoutes.Create} replace />} />
    </Routes>
  )
}
