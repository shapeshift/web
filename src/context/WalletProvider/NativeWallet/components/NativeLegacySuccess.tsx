import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useHistory, useLocation } from 'react-router-dom'

import { LegacyLoginSuccess } from './LegacyMigration/LegacyLoginSuccess'

export const NativeLegacySuccess = () => {
  const history = useHistory<{ vault: Vault }>()
  const location = useLocation<{ vault: Vault }>()

  const handleContinue = () => {
    history.push('/native/create', location.state)
  }

  return <LegacyLoginSuccess onContinue={handleContinue} />
}
