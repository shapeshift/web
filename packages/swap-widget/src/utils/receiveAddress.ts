import type { ChainId } from '../types'
import { sharesAddressSpace } from './addressSpace'
import { validateAddress } from './addressValidation'

type ResolveReceiveAddressArgs = {
  isLocked: boolean
  defaultAddress: string | undefined
  // The chain the integrator supplied the default address for
  defaultAddressChainId: ChainId
  customAddress: string
  walletAddress: string | undefined
  buyChainId: ChainId
}

export const resolveReceiveAddress = ({
  isLocked,
  defaultAddress,
  defaultAddressChainId,
  customAddress,
  walletAddress,
  buyChainId,
}: ResolveReceiveAddressArgs): string | undefined => {
  const isValidForBuyChain = (address: string | undefined): boolean =>
    !!address && validateAddress(address, buyChainId).valid

  // An unusable locked address blocks rather than quietly paying the user's own wallet
  if (isLocked) {
    const isUsable =
      sharesAddressSpace(defaultAddressChainId, buyChainId) && isValidForBuyChain(defaultAddress)
    return isUsable ? defaultAddress : undefined
  }

  if (isValidForBuyChain(customAddress)) return customAddress

  return isValidForBuyChain(walletAddress) ? walletAddress : undefined
}
