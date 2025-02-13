import { AnimatePresence } from 'framer-motion'
import { MemoryRouter, Redirect, Route, Switch } from 'react-router'
import { Dialog } from 'components/Modal/components/Dialog'

import { CreateWalletRouter } from './routes/CreateWallet/CreateWalletRouter'
import { DeleteWallet } from './routes/DeleteWallet/DeleteWallet'
import { ImportRouter } from './routes/ImportWallet/ImportRouter'
import { ManualBackup } from './routes/ManualBackup/ManualBackup'
import { RenameWallet } from './routes/RenameWallet'
import { SavedWallets } from './routes/SavedWallets'
import { MobileWalletDialogRoutes } from './types'

type MobileWalletDialogProps = {
  isOpen: boolean
  onClose: () => void
  defaultRoute?: MobileWalletDialogRoutes
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
          {({ location }) => (
            <AnimatePresence mode='wait' initial={false}>
              <Switch key={location.key} location={location}>
                <Route path={MobileWalletDialogRoutes.Backup}>
                  <ManualBackup showContinueButton={false} />
                </Route>
                <Route path={MobileWalletDialogRoutes.Import}>
                  <ImportRouter onClose={onClose} defaultRoute={defaultRoute} />
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
                  <CreateWalletRouter onClose={onClose} defaultRoute={defaultRoute} />
                </Route>
                <Redirect exact from='/' to={defaultRoute} />
              </Switch>
            </AnimatePresence>
          )}
        </Route>
      </MemoryRouter>
    </Dialog>
  )
}
