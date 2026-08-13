import type { ChainId } from '../types'
import { validateAddress } from './addressValidation'

type ResolveSendAddressArgs = {
  customAddress: string
  walletAddress: string | undefined
  sellChainId: ChainId
}

// Doubles as the refund address on deposit swaps, so the two can never disagree
export const resolveSendAddress = ({
  customAddress,
  walletAddress,
  sellChainId,
}: ResolveSendAddressArgs): string | undefined => {
  if (walletAddress) return walletAddress

  return validateAddress(customAddress, sellChainId).valid ? customAddress : undefined
}
