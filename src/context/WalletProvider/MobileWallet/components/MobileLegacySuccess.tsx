import { useHistory, useLocation } from 'react-router-dom'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { LegacyLoginSuccess } from 'context/WalletProvider/NativeWallet/components/LegacyMigration/LegacyLoginSuccess'

export const MobileLegacySuccess = () => {
  const history = useHistory<{ vault: RevocableWallet }>()
  const location = useLocation<{ vault: RevocableWallet }>()

  const handleContinue = () => {
    history.push('/mobile/legacy/create', location.state)
  }

  return <LegacyLoginSuccess onContinue={handleContinue} />
}
