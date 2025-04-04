import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo } from 'react'
import { MemoryRouter, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { ManualBackup } from '../ManualBackup/ManualBackup'
import { CreateBackupConfirm } from './CreateBackupConfirm'
import { CreateSuccess } from './CreateSuccess'
import { CreateWallet } from './CreateWallet'
import { KeepSafe } from './KeepSafe'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { SlideTransition } from '@/components/SlideTransition'

const createBackupConfirm = <CreateBackupConfirm />
const manualBackup = <ManualBackup />
const keepSafe = <KeepSafe />
const createRedirect = <Navigate to={MobileWalletDialogRoutes.Create} replace />

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

  const createSuccess = useMemo(() => <CreateSuccess onClose={onClose} />, [onClose])
  const createWallet = useMemo(
    () => (
      <CreateWallet
        isDefaultRoute={defaultRoute === MobileWalletDialogRoutes.Create}
        onClose={onClose}
        handleRedirectToHome={handleRedirectToHome}
      />
    ),
    [defaultRoute, handleRedirectToHome, onClose],
  )

  return (
    <Switch location={location.pathname}>
      <Route path={MobileWalletDialogRoutes.CreateBackupSuccess}>{createSuccess}</Route>
      <Route path={MobileWalletDialogRoutes.CreateBackupConfirm}>{createBackupConfirm}</Route>
      <Route path={MobileWalletDialogRoutes.CreateBackup}>{manualBackup}</Route>
      <Route path={MobileWalletDialogRoutes.KeepSafe}>{keepSafe}</Route>
      <Route path={MobileWalletDialogRoutes.Create}>{createWallet}</Route>
      <Route path='/'>{createRedirect}</Route>
    </Switch>
  )
}
