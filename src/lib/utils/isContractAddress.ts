import { isEvmAddress } from './isEvmAddress'
import { isSolanaAddress } from './isSolanaAddress'

export const isContractAddress = (address: string) =>
  isEvmAddress(address) || isSolanaAddress(address)
