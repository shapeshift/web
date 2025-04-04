import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { Navigate } from 'react-router'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { CreateWalletRouter } from './routes/CreateWallet/CreateWalletRouter'
import { DeleteWallet } from './routes/DeleteWallet/DeleteWallet'
import { ImportRouter } from './routes/ImportWallet/ImportRouter'
import { ManualBackup } from './routes/ManualBackup/ManualBackup'
import { RenameWallet } from './routes/RenameWallet'
import { SavedWallets } from './routes/SavedWallets'
import { MobileWalletDialogRoutes } from './types'

import { Dialog } from '@/components/Modal/components/Dialog'

type MobileWalletDialogProps = {
  isOpen: boolean
  onClose: () => void
  defaultRoute?: MobileWalletDialogRoutes
}

const defaultRedirect = (defaultRoute: MobileWalletDialogRoutes) => <Navigate to={defaultRoute} />

const manualBackup = <ManualBackup showContinueButton={false} />
const renameWallet = <RenameWallet />
const deleteWallet = <DeleteWallet />

const MobileDialogRoutes = ({
  defaultRoute,
  onClose,
}: {
  defaultRoute: MobileWalletDialogRoutes
  onClose: () => void
}) => {
  const location = useLocation()

  const importRouter = useMemo(
    () => <ImportRouter onClose={onClose} defaultRoute={defaultRoute} />,
    [defaultRoute, onClose],
  )
  const savedWallets = useMemo(() => <SavedWallets onClose={onClose} />, [onClose])
  const createWalletRouter = useMemo(
    () => <CreateWalletRouter onClose={onClose} defaultRoute={defaultRoute} />,
    [defaultRoute, onClose],
  )

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location.pathname}>
        <Route path={MobileWalletDialogRoutes.Backup}>{manualBackup}</Route>
        <Route path={MobileWalletDialogRoutes.Import}>{importRouter}</Route>
        <Route path={MobileWalletDialogRoutes.Saved}>{savedWallets}</Route>
        <Route path={MobileWalletDialogRoutes.Rename}>{renameWallet}</Route>
        <Route path={MobileWalletDialogRoutes.Delete}>{deleteWallet}</Route>
        <Route path={MobileWalletDialogRoutes.Create}>{createWalletRouter}</Route>
        <Route path='/'>{defaultRedirect(defaultRoute)}</Route>
      </Switch>
    </AnimatePresence>
  )
}

export const MobileWalletDialog: React.FC<MobileWalletDialogProps> = ({
  isOpen,
  onClose,
  defaultRoute = MobileWalletDialogRoutes.Saved,
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto' isDisablingPropagation={false}>
      <MemoryRouter>
        <MobileDialogRoutes defaultRoute={defaultRoute} onClose={onClose} />
      </MemoryRouter>
    </Dialog>
  )
}
