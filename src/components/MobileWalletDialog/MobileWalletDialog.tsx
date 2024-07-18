import { AnimatePresence } from 'framer-motion'
import { MemoryRouter, Redirect, Route, Switch } from 'react-router'
import { Dialog } from 'components/Modal/components/Dialog'

import { DeleteWallet } from './routes/DeleteWallet'
import { RenameWallet } from './routes/RenameWallet'
import { SavedWallets } from './routes/SavedWallets'
import { MobileWalletDialogRoutes } from './types'

type MobileWalletDialogProps = {
  isOpen: boolean
  onClose: () => void
}

export const MobileWalletDialog: React.FC<MobileWalletDialogProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto'>
      <MemoryRouter>
        <Route>
          {({ location }) => (
            <AnimatePresence mode='wait' initial={false}>
              <Switch key={location.key} location={location}>
                <Route path={MobileWalletDialogRoutes.SAVED}>
                  <SavedWallets onClose={onClose} />
                </Route>
                <Route path={MobileWalletDialogRoutes.RENAME}>
                  <RenameWallet />
                </Route>
                <Route path={MobileWalletDialogRoutes.DELETE}>
                  <DeleteWallet />
                </Route>
                <Redirect exact from='/' to={MobileWalletDialogRoutes.SAVED} />
              </Switch>
            </AnimatePresence>
          )}
        </Route>
      </MemoryRouter>
    </Dialog>
  )
}
