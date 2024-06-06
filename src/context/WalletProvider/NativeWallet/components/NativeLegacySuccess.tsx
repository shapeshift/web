import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useCallback } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { NativeWalletRoutes } from 'context/WalletProvider/types'

import { LegacyLoginSuccess } from './LegacyMigration/LegacyLoginSuccess'

export const NativeLegacySuccess = () => {
  const history = useHistory<{ vault: Vault }>()
  const location = useLocation<{ vault: Vault }>()

  const handleContinue = useCallback(() => {
    history.push(NativeWalletRoutes.Create, location.state)
  }, [history, location.state])

  return <LegacyLoginSuccess onContinue={handleContinue} />
}
