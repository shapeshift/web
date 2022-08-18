import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
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
        <Route
          path={BackupPassphraseRoutes.Info}
          render={() => <BackupPassphraseInfo vault={vault} />}
        />
        <Route
          path={BackupPassphraseRoutes.Password}
          render={() => <BackupPassphrasePassword setVault={setVault} />}
        />
        <Route
          path={BackupPassphraseRoutes.Test}
          render={() => <BackupPassphraseTest vault={vault} />}
        />
        <Route path={BackupPassphraseRoutes.Success} component={BackupPassphraseSuccess} />
        <Redirect to={BackupPassphraseRoutes.Password} />
      </Switch>
    </AnimatePresence>
  )
}
