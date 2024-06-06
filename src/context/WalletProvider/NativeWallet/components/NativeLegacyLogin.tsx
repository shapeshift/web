import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { NativeWalletRoutes } from 'context/WalletProvider/types'
import { decryptNativeWallet } from 'lib/cryptography/login'

import type { OnLoginSuccess } from './LegacyMigration/LegacyLogin'
import { LegacyLogin } from './LegacyMigration/LegacyLogin'

export const NativeLegacyLogin = () => {
  const history = useHistory<{ vault: Vault }>()

  const handleLoginSuccess: OnLoginSuccess = useCallback(
    async args => {
      const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
      const { encryptedWallet, email, password } = args
      const vault = await Vault.create(undefined, false)
      vault.meta.set('createdAt', Date.now())
      vault.set('#mnemonic', await decryptNativeWallet(email, password, encryptedWallet))
      history.push(NativeWalletRoutes.LegacyLoginSuccess, { vault })
    },
    [history],
  )

  return <LegacyLogin onLoginSuccess={handleLoginSuccess} />
}
