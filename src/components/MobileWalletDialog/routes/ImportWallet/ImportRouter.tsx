import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo } from 'react'
import { MemoryRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { ImportKeystore } from './ImportKeystore'
import { ImportSeedPhrase } from './ImportSeedPhrase'
import { ImportSuccess } from './ImportSuccess'
import { ImportWallet } from './ImportWallet'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { SlideTransition } from '@/components/SlideTransition'

const importKeystore = <ImportKeystore />
const importSeedPhrase = <ImportSeedPhrase />

type ImportRouterProps = {
  onClose: () => void
  defaultRoute: MobileWalletDialogRoutes
}

const importRedirect = <Navigate to={MobileWalletDialogRoutes.Import} replace />

export const ImportRouter = ({ onClose, defaultRoute }: ImportRouterProps) => {
  const navigate = useNavigate()

  const handleRedirectToHome = useCallback(() => {
    navigate(MobileWalletDialogRoutes.Saved)
  }, [navigate])

  const importSuccess = useMemo(() => <ImportSuccess onClose={onClose} />, [onClose])
  const importWallet = useMemo(
    () => (
      <ImportWallet
        isDefaultRoute={defaultRoute === MobileWalletDialogRoutes.Import}
        onClose={onClose}
        handleRedirectToHome={handleRedirectToHome}
      />
    ),
    [defaultRoute, handleRedirectToHome, onClose],
  )

  return (
    <SlideTransition>
      <MemoryRouter>
        <AnimatePresence mode='wait' initial={false}>
          <Routes>
            <Route path={MobileWalletDialogRoutes.ImportSuccess} element={importSuccess} />
            <Route path={MobileWalletDialogRoutes.ImportSeedPhrase} element={importSeedPhrase} />
            <Route path={MobileWalletDialogRoutes.ImportKeystore} element={importKeystore} />
            <Route path={MobileWalletDialogRoutes.Import} element={importWallet} />
            <Route path='/' element={importRedirect} />
          </Routes>
        </AnimatePresence>
      </MemoryRouter>
    </SlideTransition>
  )
}
