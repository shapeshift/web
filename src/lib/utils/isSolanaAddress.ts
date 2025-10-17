import { PublicKey } from '@solana/web3.js'

export const isSolanaAddress = (contractAddress: string) => {
  try {
    new PublicKey(contractAddress)
    return true
  } catch (error) {
    // If instantiation fails, it's not a valid Solana address
    return false
  }
}
