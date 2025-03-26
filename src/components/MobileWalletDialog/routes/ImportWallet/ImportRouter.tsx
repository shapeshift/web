import { AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import { MemoryRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { ImportKeystore } from './ImportKeystore'
import { ImportSeedPhrase } from './ImportSeedPhrase'
import { ImportSuccess } from './ImportSuccess'
import { ImportWallet } from './ImportWallet'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { SlideTransition } from '@/components/SlideTransition'

type ImportRouterProps = {
  onClose: () => void
  defaultRoute: MobileWalletDialogRoutes
}

const ImportRedirect = () => <Navigate to={MobileWalletDialogRoutes.Import} replace />

export const ImportRouter = ({ onClose, defaultRoute }: ImportRouterProps) => {
  const navigate = useNavigate()

  const handleRedirectToHome = useCallback(() => {
    navigate(MobileWalletDialogRoutes.Saved)
  }, [navigate])

  return (
    <SlideTransition>
      <MemoryRouter>
        <AnimatePresence mode='wait' initial={false}>
          <Routes>
            <Route 
              path={MobileWalletDialogRoutes.ImportSuccess}
              element={<ImportSuccess onClose={onClose} />}
            />
            <Route 
              path={MobileWalletDialogRoutes.ImportSeedPhrase}
              element={<ImportSeedPhrase />}
            />
            <Route 
              path={MobileWalletDialogRoutes.ImportKeystore}
              element={<ImportKeystore />}
            />
            <Route 
              path={MobileWalletDialogRoutes.Import}
              element={
                <ImportWallet
                  isDefaultRoute={defaultRoute === MobileWalletDialogRoutes.Import}
                  onClose={onClose}
                  handleRedirectToHome={handleRedirectToHome}
                />
              }
            />
            <Route path='/' element={<ImportRedirect />} />
          </Routes>
        </AnimatePresence>
      </MemoryRouter>
    </SlideTransition>
  )
}
