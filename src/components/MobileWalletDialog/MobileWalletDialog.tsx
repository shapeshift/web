import { AnimatePresence } from 'framer-motion'
import { Navigate, Routes } from 'react-router'
import { MemoryRouter, Route, useLocation } from 'react-router-dom'

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

  const importRouter = <ImportRouter onClose={onClose} defaultRoute={defaultRoute} />
  const savedWallets = <SavedWallets onClose={onClose} />
  const createWalletRouter = <CreateWalletRouter onClose={onClose} defaultRoute={defaultRoute} />

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Routes key={location.key} location={location}>
        <Route path={MobileWalletDialogRoutes.Backup} element={manualBackup} />
        <Route path={MobileWalletDialogRoutes.Import} element={importRouter} />
        <Route path={MobileWalletDialogRoutes.Saved} element={savedWallets} />
        <Route path={MobileWalletDialogRoutes.Rename} element={renameWallet} />
        <Route path={MobileWalletDialogRoutes.Delete} element={deleteWallet} />
        <Route path={MobileWalletDialogRoutes.Create} element={createWalletRouter} />
        <Route path='/' element={defaultRedirect(defaultRoute)} />
      </Routes>
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
        <Route>
          <MobileDialogRoutes defaultRoute={defaultRoute} onClose={onClose} />
        </Route>
      </MemoryRouter>
    </Dialog>
  )
}
