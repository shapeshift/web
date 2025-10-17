import { isEvmAddress } from './isEvmAddress'
import { isSolanaAddress } from './solanaAddress'

export const isContractAddress = (address: string) =>
  isEvmAddress(address) || isSolanaAddress(address)
