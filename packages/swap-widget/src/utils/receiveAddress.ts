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

  // An unusable locked address blocks rather than quietly paying the user's own wallet
  if (isLocked) return isValidForBuyChain(defaultAddress) ? defaultAddress : undefined

  if (isValidForBuyChain(customAddress)) return customAddress

  return isValidForBuyChain(walletAddress) ? walletAddress : undefined
}
