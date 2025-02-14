import { AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import { MemoryRouter, Redirect, Route, Switch, useHistory } from 'react-router'
import { MobileWalletDialogRoutes } from 'components/MobileWalletDialog/types'
import { SlideTransition } from 'components/SlideTransition'

import { ImportKeystore } from './ImportKeystore'
import { ImportSeedPhrase } from './ImportSeedPhrase'
import { ImportSuccess } from './ImportSuccess'
import { ImportWallet } from './ImportWallet'

type ImportRouterProps = {
  onClose: () => void
  defaultRoute: MobileWalletDialogRoutes
}

export const ImportRouter = ({ onClose, defaultRoute }: ImportRouterProps) => {
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
                <Route path={MobileWalletDialogRoutes.ImportSuccess}>
                  <ImportSuccess onClose={onClose} />
                </Route>
                <Route path={MobileWalletDialogRoutes.ImportSeedPhrase}>
                  <ImportSeedPhrase />
                </Route>
                <Route path={MobileWalletDialogRoutes.ImportKeystore}>
                  <ImportKeystore />
                </Route>
                <Route path={MobileWalletDialogRoutes.Import}>
                  <ImportWallet
                    isDefaultRoute={defaultRoute === MobileWalletDialogRoutes.Import}
                    onClose={onClose}
                    handleRedirectToHome={handleRedirectToHome}
                  />
                </Route>
                <Redirect from='/' to={MobileWalletDialogRoutes.Import} />
              </Switch>
            </AnimatePresence>
          )}
        </Route>
      </MemoryRouter>
    </SlideTransition>
  )
}
