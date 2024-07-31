import { AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import { MemoryRouter, Redirect, Route, Switch, useHistory, useLocation } from 'react-router'
import { MobileWalletDialogRoutes } from 'components/MobileWalletDialog/types'
import { SlideTransition } from 'components/SlideTransition'
import type { MobileLocationState } from 'context/WalletProvider/MobileWallet/types'

import { Backup } from './Backup'
import { ConfirmDelete } from './Confirm'

export const DeleteWallet = () => {
  const parentLocation = useLocation<MobileLocationState>()
  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push(MobileWalletDialogRoutes.SAVED)
  }, [history])

  return (
    <SlideTransition>
      <MemoryRouter>
        <Route>
          {({ location }) => (
            <AnimatePresence mode='wait' initial={false}>
              <Switch key={location.key} location={location}>
                <Route path={MobileWalletDialogRoutes.BACKUP}>
                  <Backup onBack={handleBack} />
                </Route>
                <Route path={MobileWalletDialogRoutes.CONFIRM_DELETE}>
                  <ConfirmDelete vault={parentLocation.state.vault} onBack={handleBack} />
                </Route>
                {/* TODO: This will change to backup in a follow up PR */}
                <Redirect from='/' to={MobileWalletDialogRoutes.CONFIRM_DELETE} />
              </Switch>
            </AnimatePresence>
          )}
        </Route>
      </MemoryRouter>
    </SlideTransition>
  )
}
