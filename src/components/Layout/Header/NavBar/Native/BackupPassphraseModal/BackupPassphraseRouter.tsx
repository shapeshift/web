import { useUnmountEffect } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseInfo } from './BackupPassphraseInfo'
import { BackupPassphrasePassword } from './BackupPassphrasePassword'
import { BackupPassphraseStart } from './BackupPassphraseStart'
import { BackupPassphraseSuccess } from './BackupPassphraseSuccess'
import { BackupPassphraseTest } from './BackupPassphraseTest'

import { createRevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const StartRedirect = () => <Navigate to={BackupPassphraseRoutes.Start} replace />

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
    <AnimatePresence mode='wait'>
      <Routes>
        <Route
          path={BackupPassphraseRoutes.Start}
          element={<BackupPassphraseStart revocableWallet={revocableWallet} />}
        />
        <Route
          path={BackupPassphraseRoutes.Info}
          element={<BackupPassphraseInfo revocableWallet={revocableWallet} />}
        />
        <Route
          path={BackupPassphraseRoutes.Password}
          element={<BackupPassphrasePassword revocableWallet={revocableWallet} />}
        />
        <Route
          path={BackupPassphraseRoutes.Test}
          element={<BackupPassphraseTest revocableWallet={revocableWallet} />}
        />
        <Route path={BackupPassphraseRoutes.Success} element={<BackupPassphraseSuccess />} />
        <Route path='*' element={<StartRedirect />} />
      </Routes>
    </AnimatePresence>
  )
}
