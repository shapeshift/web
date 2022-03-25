import { crypto } from '@shapeshiftoss/hdwallet-native'

const { EncryptedWallet } = crypto
const cryptoEngine = new crypto.engines.WebCryptoEngine()

export const getEncryptedWallet = async (password?: string, encryptedWalletString?: string) => {
  const wallet = new EncryptedWallet(cryptoEngine)
  if (password) {
    await wallet.init(password, password, encryptedWalletString)
  }
  return wallet
}
