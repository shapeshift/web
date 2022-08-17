import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router-dom'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseIndex } from './BackupPassphrasIndex'

export const BackupPassphraseRouter = () => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter>
      <Switch location={location} key={location.key}>
        <Route path={BackupPassphraseRoutes.Index} render={BackupPassphraseIndex} />
      </Switch>
    </AnimatePresence>
  )
}
