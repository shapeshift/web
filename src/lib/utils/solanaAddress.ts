import { PublicKey } from '@solana/web3.js'

export const isSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address)
    return true
  } catch {
    // If instantiation fails, it's not a valid Solana address
    return false
  }
}
