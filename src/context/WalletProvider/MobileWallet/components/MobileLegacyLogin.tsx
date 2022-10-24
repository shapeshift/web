import { useHistory } from 'react-router-dom'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { createRevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import type { OnLoginSuccess } from 'context/WalletProvider/NativeWallet/components/LegacyMigration/LegacyLogin'
import { LegacyLogin } from 'context/WalletProvider/NativeWallet/components/LegacyMigration/LegacyLogin'
import { decryptNativeWallet } from 'lib/cryptography/login'

export const MobileLegacyLogin = () => {
  const history = useHistory<{ vault: RevocableWallet }>()

  const handleLoginSuccess: OnLoginSuccess = async args => {
    const { encryptedWallet, email, password } = args
    const mnemonic = await decryptNativeWallet(email, password, encryptedWallet)
    if (mnemonic) {
      const vault = createRevocableWallet({
        label: 'Imported ShapeShift Wallet',
        mnemonic,
      })
      history.push('/mobile/legacy/login/success', { vault })
    }
    // There was an error decrypting the wallet
  }

  return <LegacyLogin onLoginSuccess={handleLoginSuccess} />
}
