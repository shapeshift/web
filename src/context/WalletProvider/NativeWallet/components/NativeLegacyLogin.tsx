import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useHistory } from 'react-router-dom'
import { decryptNativeWallet } from 'lib/cryptography/login'

import type { OnLoginSuccess } from './LegacyMigration/LegacyLogin'
import { LegacyLogin } from './LegacyMigration/LegacyLogin'

export const NativeLegacyLogin = () => {
  const history = useHistory<{ vault: Vault }>()

  const handleLoginSuccess: OnLoginSuccess = async args => {
    const { encryptedWallet, email, password } = args
    const vault = await Vault.create(undefined, false)
    vault.meta.set('createdAt', Date.now())
    vault.set('#mnemonic', await decryptNativeWallet(email, password, encryptedWallet))
    history.push('/native/legacy/login/success', { vault })
  }

  return <LegacyLogin onLoginSuccess={handleLoginSuccess} />
}
