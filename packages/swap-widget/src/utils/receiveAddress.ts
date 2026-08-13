import type { ChainId } from '../types'
import { validateAddress } from './addressValidation'

type ResolveReceiveAddressArgs = {
  isLocked: boolean
  defaultAddress: string | undefined
  customAddress: string
  walletAddress: string | undefined
  buyChainId: ChainId
}

export const resolveReceiveAddress = ({
  isLocked,
  defaultAddress,
  customAddress,
  walletAddress,
  buyChainId,
}: ResolveReceiveAddressArgs): string | undefined => {
  const isValidForBuyChain = (address: string | undefined): boolean =>
    !!address && validateAddress(address, buyChainId).valid

  // A locked address is the only one allowed, so an unusable one leaves the swap without an address
  // rather than quietly sending the funds to the user's own wallet
  if (isLocked) return isValidForBuyChain(defaultAddress) ? defaultAddress : undefined

  return isValidForBuyChain(customAddress) ? customAddress : walletAddress
}
