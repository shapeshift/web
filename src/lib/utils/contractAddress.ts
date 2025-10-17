import { isEthAddress } from './ethAddress'
import { isSolanaAddress } from './solanaAddress'

/**
 * Detects if a string is a valid contract address (EVM or Solana).
 * Used to distinguish contract address searches from name/symbol searches.
 */
export const isContractAddress = (address: string): boolean => {
  return isEthAddress(address) || isSolanaAddress(address)
}

// Re-export for convenience
export { isEthAddress, isSolanaAddress }
