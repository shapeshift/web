import { AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import { MemoryRouter, Redirect, Route, Switch, useHistory } from 'react-router'
import { MobileWalletDialogRoutes } from 'components/MobileWalletDialog/types'
import { SlideTransition } from 'components/SlideTransition'

import { ManualBackup } from '../ManualBackup/ManualBackup'
import { CreateBackupConfirm } from './CreateBackupConfirm'
import { CreateSuccess } from './CreateSuccess'
import { CreateWallet } from './CreateWallet'
import { KeepSafe } from './KeepSafe'

type CreateWalletRouterProps = {
  onClose: () => void
  defaultRoute: MobileWalletDialogRoutes
}

export const CreateWalletRouter = ({ onClose, defaultRoute }: CreateWalletRouterProps) => {
  const history = useHistory()

  const handleRedirectToHome = useCallback(() => {
    history.push(MobileWalletDialogRoutes.Saved)
  }, [history])

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
                  <CreateWallet
                    isDefaultRoute={defaultRoute === MobileWalletDialogRoutes.Create}
                    onClose={onClose}
                    handleRedirectToHome={handleRedirectToHome}
                  />
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
