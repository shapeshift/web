import { AnimatePresence } from 'framer-motion'
import { MemoryRouter, Redirect, Route, Switch } from 'react-router'
import { MobileWalletDialogRoutes } from 'components/MobileWalletDialog/types'
import { SlideTransition } from 'components/SlideTransition'

import { CreateBackupConfirm } from './CreateBackupConfirm'
import { CreateSuccess } from './CreateSuccess'
import { CreateWallet } from './CreateWallet'
import { KeepSafe } from './KeepSafe'
import { ManualBackup } from './ManualBackup'

type CreateRouterProps = {
  onClose: () => void
}

export const CreateRouter = ({ onClose }: CreateRouterProps) => {
  return (
    <SlideTransition>
      <MemoryRouter>
        <Route>
          {({ location }) => (
            <AnimatePresence mode='wait' initial={false}>
              <Switch key={location.key} location={location}>
                <Route path={MobileWalletDialogRoutes.CreateBackupSuccess}>
                  <CreateSuccess onClose={onClose} />
                </Route>
                <Route path={MobileWalletDialogRoutes.CreateBackupConfirm}>
                  <CreateBackupConfirm />
                </Route>
                <Route path={MobileWalletDialogRoutes.CreateBackup}>
                  <ManualBackup />
                </Route>
                <Route path={MobileWalletDialogRoutes.KeepSafe}>
                  <KeepSafe />
                </Route>
                <Route path={MobileWalletDialogRoutes.Create}>
                  <CreateWallet />
                </Route>
                <Redirect from='/' to={MobileWalletDialogRoutes.Create} />
              </Switch>
            </AnimatePresence>
          )}
        </Route>
      </MemoryRouter>
    </SlideTransition>
  )
}
