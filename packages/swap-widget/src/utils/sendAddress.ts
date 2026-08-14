import type { ChainId } from '../types'
import { validateAddress } from './addressValidation'

type ResolveSendAddressArgs = {
  customAddress: string
  walletAddress: string | undefined
  sellChainId: ChainId
}

export const resolveSendAddress = ({
  customAddress,
  walletAddress,
  sellChainId,
}: ResolveSendAddressArgs): string | undefined => {
  if (walletAddress && validateAddress(walletAddress, sellChainId).valid) return walletAddress

  return validateAddress(customAddress, sellChainId).valid ? customAddress : undefined
}
