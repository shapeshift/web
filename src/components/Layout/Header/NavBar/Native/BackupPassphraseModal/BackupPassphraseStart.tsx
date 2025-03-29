import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { LocationState } from './BackupPassphraseCommon'
import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { getWallet } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const BackupPassphraseStart: React.FC<LocationState> = props => {
  const { revocableWallet } = props
  const navigate = useNavigate()
  const { state } = useWallet()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      switch (state.modalType) {
        case KeyManager.Native:
          // Native wallets require a password to decrypt
          navigate(BackupPassphraseRoutes.Password)
          break
        case KeyManager.Mobile:
          const wallet = await getWallet(state.walletInfo?.deviceId ?? '')
          if (wallet?.mnemonic) {
            revocableWallet.mnemonic = wallet.mnemonic
            navigate(BackupPassphraseRoutes.Info)
          } else {
            setError('Error')
          }
          // Mobile wallet access is controlled via the OS, so we can skip the password screen
          break
        default:
          // No other wallets are supported
          break
      }
    })()
  }, [navigate, revocableWallet, state.walletInfo, state.modalType])

  return error ? <div>{error}</div> : null
}
