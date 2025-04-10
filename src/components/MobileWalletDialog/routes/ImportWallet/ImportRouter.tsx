import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo } from 'react'
import { MemoryRouter, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

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

const ImportRoutes = ({
  onClose,
  defaultRoute,
  handleRedirectToHome,
}: ImportRouterProps & { handleRedirectToHome: () => void }) => {
  const location = useLocation()
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
    <Switch location={location.pathname}>
      <Route path={MobileWalletDialogRoutes.ImportSuccess}>{importSuccess}</Route>
      <Route path={MobileWalletDialogRoutes.ImportSeedPhrase}>{importSeedPhrase}</Route>
      <Route path={MobileWalletDialogRoutes.ImportKeystore}>{importKeystore}</Route>
      <Route path={MobileWalletDialogRoutes.Import}>{importWallet}</Route>
      <Route path='/'>{importRedirect}</Route>
    </Switch>
  )
}

export const ImportRouter = (props: ImportRouterProps) => {
  const navigate = useNavigate()

  const handleRedirectToHome = useCallback(() => {
    navigate(MobileWalletDialogRoutes.Saved)
  }, [navigate])

  return (
    <SlideTransition>
      <MemoryRouter>
        <AnimatePresence mode='wait' initial={false}>
          <ImportRoutes {...props} handleRedirectToHome={handleRedirectToHome} />
        </AnimatePresence>
      </MemoryRouter>
    </SlideTransition>
  )
}
