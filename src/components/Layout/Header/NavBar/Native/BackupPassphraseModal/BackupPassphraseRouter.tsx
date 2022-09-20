import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { AnimatePresence } from 'framer-motion'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseInfo } from './BackupPassphraseInfo'
import { BackupPassphrasePassword } from './BackupPassphrasePassword'
import { BackupPassphraseSuccess } from './BackupPassphraseSuccess'
import { BackupPassphraseTest } from './BackupPassphraseTest'

type BackupPassphraseRouterProps = {
  vault: Vault | null
  setVault: (vault: Vault) => void
}
export const BackupPassphraseRouter = ({ vault, setVault }: BackupPassphraseRouterProps) => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter>
      <Switch location={location} key={location.key}>
        <Route path={BackupPassphraseRoutes.Info}>
          <BackupPassphraseInfo vault={vault} />
        </Route>
        <Route path={BackupPassphraseRoutes.Password}>
          <BackupPassphrasePassword setVault={setVault} />
        </Route>
        <Route path={BackupPassphraseRoutes.Test}>
          <BackupPassphraseTest vault={vault} />
        </Route>
        <Route path={BackupPassphraseRoutes.Success} component={BackupPassphraseSuccess} />
        <Redirect to={BackupPassphraseRoutes.Password} />
      </Switch>
    </AnimatePresence>
  )
}
