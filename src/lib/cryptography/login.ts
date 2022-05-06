import { crypto } from '@shapeshiftoss/hdwallet-native'

const { EncryptedWallet } = crypto
const cryptoEngine = new crypto.engines.WebCryptoEngine()

const getEncryptedWallet = () => {
  return new EncryptedWallet(cryptoEngine)
}

export async function getPasswordHash(email: string, password: string): Promise<string> {
  if (!password || !email) {
    throw new Error('An email and password are required to hash the password.')
  }

  const emptyWallet = getEncryptedWallet()
  await emptyWallet.init(email, password)
  if (!emptyWallet.passwordHash) throw new Error('Error getting password hash.')
  return emptyWallet.passwordHash
}

export const decryptNativeWallet = async (
  email: string,
  password: string,
  encryptedWalletString: string,
): Promise<string> => {
  if (!email || !password)
    throw new Error('An email and password are required to decrypt the wallet.')
  if (!encryptedWalletString) throw new Error('An encryptedWallet is required for decryption.')
  try {
    const encryptedWallet = getEncryptedWallet()
    await encryptedWallet.init(email, password, encryptedWalletString)
    const mnemonic = await encryptedWallet.decrypt()
    return mnemonic
  } catch (e) {
    throw new Error('Native wallet decryption failed: ' + e)
  }
}
