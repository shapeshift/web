import { isEvmAddress } from './isEvmAddress'
import { isSolanaAddress } from './isSolanaAddress'
import { isStarknetAddress } from './isStarknetAddress'

export const isContractAddress = (address: string) =>
  isEvmAddress(address) || isSolanaAddress(address) || isStarknetAddress(address)
