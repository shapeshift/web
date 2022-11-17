import { useUnmountEffect } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'
import { createRevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseInfo } from './BackupPassphraseInfo'
import { BackupPassphrasePassword } from './BackupPassphrasePassword'
import { BackupPassphraseStart } from './BackupPassphraseStart'
import { BackupPassphraseSuccess } from './BackupPassphraseSuccess'
import { BackupPassphraseTest } from './BackupPassphraseTest'

export const BackupPassphraseRouter = () => {
  const location = useLocation()
  const { state } = useWallet()
  const [revocableWallet, setRevocableWallet] = useState(
    createRevocableWallet({
      id: state.walletInfo?.deviceId,
      label: state.walletInfo?.name,
    }),
  )

  useUnmountEffect(() => {
    revocableWallet?.revoke()
    setRevocableWallet(
      createRevocableWallet({
        id: state.walletInfo?.deviceId,
        label: state.walletInfo?.name,
      }),
    )
  }, [])

  return (
    <AnimatePresence exitBeforeEnter>
      <Switch location={location} key={location.key}>
        <Route exact path={BackupPassphraseRoutes.Start}>
          <BackupPassphraseStart revocableWallet={revocableWallet} />
        </Route>
        <Route path={BackupPassphraseRoutes.Info}>
          <BackupPassphraseInfo revocableWallet={revocableWallet} />
        </Route>
        <Route path={BackupPassphraseRoutes.Password}>
          <BackupPassphrasePassword revocableWallet={revocableWallet} />
        </Route>
        <Route path={BackupPassphraseRoutes.Test}>
          <BackupPassphraseTest revocableWallet={revocableWallet} />
        </Route>
        <Route path={BackupPassphraseRoutes.Success}>
          <BackupPassphraseSuccess />
        </Route>
        <Redirect to={BackupPassphraseRoutes.Start} />
      </Switch>
    </AnimatePresence>
  )
}
