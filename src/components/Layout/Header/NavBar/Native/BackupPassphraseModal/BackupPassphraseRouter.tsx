import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseInfo } from './BackupPassphraseInfo'
import { BackupPassphrasePassword } from './BackupPassphrasePassword'
import { BackupPassphraseSkip } from './BackupPassphraseSkip'
import { BackupPassphraseStart } from './BackupPassphraseStart'
import { BackupPassphraseSuccess } from './BackupPassphraseSuccess'
import { BackupPassphraseTest } from './BackupPassphraseTest'
import { BackupPassphraseWordsError } from './BackupPassphraseWordsError'

import { createRevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const BackupPassphraseRouter = () => {
  const { state } = useWallet()
  const location = useLocation()

  const [revocableWallet, setRevocableWallet] = useState(
    createRevocableWallet({
      id: state.walletInfo?.deviceId,
      label: state.walletInfo?.name,
    }),
  )

  useEffect(
    // Revoke on unmount
    () => () => {
      revocableWallet?.revoke()
      setRevocableWallet(
        createRevocableWallet({
          id: state.walletInfo?.deviceId,
          label: state.walletInfo?.name,
        }),
      )
    },
    // Don't add revoker and related deps here or problems
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <AnimatePresence mode='wait'>
      <Switch location={location.pathname}>
        <Route path={BackupPassphraseRoutes.Start}>
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
        <Route path={BackupPassphraseRoutes.Skip}>
          <BackupPassphraseSkip />
        </Route>
        <Route path={BackupPassphraseRoutes.WordsError}>
          <BackupPassphraseWordsError />
        </Route>
        <Route path={BackupPassphraseRoutes.Success}>
          <BackupPassphraseSuccess />
        </Route>
        <Route>
          <BackupPassphraseStart revocableWallet={revocableWallet} />
        </Route>
      </Switch>
    </AnimatePresence>
  )
}
