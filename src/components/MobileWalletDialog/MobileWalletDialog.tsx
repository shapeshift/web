import { AnimatePresence } from 'framer-motion'
import { MemoryRouter, Redirect, Route, Switch } from 'react-router'
import { Dialog } from 'components/Modal/components/Dialog'

import { CreateRouter } from './routes/CreateWallet/CreateRouter'
import { ManualBackup } from './routes/CreateWallet/ManualBackup'
import { DeleteWallet } from './routes/DeleteWallet/DeleteWallet'
import { RenameWallet } from './routes/RenameWallet'
import { SavedWallets } from './routes/SavedWallets'
import { MobileWalletDialogRoutes } from './types'

type MobileWalletDialogProps = {
  isOpen: boolean
  onClose: () => void
}

export const MobileWalletDialog: React.FC<MobileWalletDialogProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto' isDisablingPropagation={false}>
      <MemoryRouter>
        <Route>
          {({ location }) => (
            <AnimatePresence mode='wait' initial={false}>
              <Switch key={location.key} location={location}>
                <Route path={MobileWalletDialogRoutes.Backup}>
                  <ManualBackup showContinueButton={false} />
                </Route>
                <Route path={MobileWalletDialogRoutes.Saved}>
                  <SavedWallets onClose={onClose} />
                </Route>
                <Route path={MobileWalletDialogRoutes.Rename}>
                  <RenameWallet />
                </Route>
                <Route path={MobileWalletDialogRoutes.Delete}>
                  <DeleteWallet />
                </Route>
                <Route path={MobileWalletDialogRoutes.Create}>
                  <CreateRouter onClose={onClose} />
                </Route>
                <Redirect exact from='/' to={MobileWalletDialogRoutes.Saved} />
              </Switch>
            </AnimatePresence>
          )}
        </Route>
      </MemoryRouter>
    </Dialog>
  )
}
