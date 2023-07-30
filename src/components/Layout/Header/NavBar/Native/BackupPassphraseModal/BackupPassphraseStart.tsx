import { useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { getWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { LocationState } from './BackupPassphraseCommon'
import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

export const BackupPassphraseStart: React.FC<LocationState> = props => {
  const { revocableWallet } = props
  const history = useHistory<LocationState>()
  const { state } = useWallet()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      switch (state.modalType) {
        case KeyManager.Native:
          // Native wallets require a password to decrypt
          history.push(BackupPassphraseRoutes.Password)
          break
        case KeyManager.Mobile:
          const wallet = await getWallet(state.walletInfo?.deviceId ?? '')
          if (wallet?.mnemonic) {
            revocableWallet.mnemonic = wallet.mnemonic
            history.push(BackupPassphraseRoutes.Info)
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
  }, [history, revocableWallet, state.walletInfo, state.modalType])

  return error ? <div>{error}</div> : null
}
