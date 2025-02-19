import { useCallback } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { NativeWalletRoutes } from 'context/WalletProvider/types'

import type { LocationState } from '../types'
import { LegacyLoginSuccess } from './LegacyMigration/LegacyLoginSuccess'

export const NativeLegacySuccess = () => {
  const history = useHistory<LocationState>()
  const location = useLocation<LocationState>()

  const handleContinue = useCallback(() => {
    history.push(NativeWalletRoutes.Create, {
      vault: location.state.vault,
    })
  }, [history, location.state])

  return <LegacyLoginSuccess onContinue={handleContinue} />
}
