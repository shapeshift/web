import type { AccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import type { RouteComponentProps } from 'react-router-dom'
import { Route, Switch, useLocation } from 'react-router-dom'

import { ConnectRoutes } from './ConnectCommon'
import { ConnectIndex } from './ConnectIndex'

export const ConnectRouter = ({
  handleConnect,
  account,
}: {
  handleConnect: (uri: string) => void
  handleAccountChange: (accountId: AccountId) => void
  account: AccountId | null
}) => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter>
      <Switch location={location} key={location.key}>
        <Route
          path={ConnectRoutes.Index}
          component={(props: RouteComponentProps) => (
            <ConnectIndex handleConnect={handleConnect} account={account} {...props} />
          )}
        />
      </Switch>
    </AnimatePresence>
  )
}
