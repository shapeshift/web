import type { ParseAddressByChainIdInput, ParseAddressResult } from './types'
import { validateAddress } from './validation'
import {
  resolveVanityAddress,
  reverseLookupVanityAddress,
  validateVanityAddress,
} from './vanityAddress'

import { knownChainIds } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export type {
  ParseAddressInputReturn,
  ResolveVanityAddress,
  ResolveVanityAddressReturn,
  ReverseLookupVanityAddress,
  ValidateVanityAddress,
} from './types'
export { validateAddress } from './validation'

export const parseAddress = async ({
  address,
}: {
  address: string
}): Promise<ParseAddressResult> => {
  // Find which chain this address belongs to
  for (const chainId of knownChainIds) {
    try {
      const isValidAddress = await validateAddress({ chainId, maybeAddress: address })
      if (isValidAddress) {
        const adapter = getChainAdapterManager().get(chainId)
        if (!adapter) continue

        const defaultAssetId = adapter.getFeeAssetId()
        return {
          chainId,
          value: address,
          assetId: defaultAssetId,
        }
      }
    } catch (error) {
      continue
    }
  }

  // Address validation failed
  throw new Error('Address validation failed')
}

// Parses an address or vanity address for a **known** ChainId
export const parseAddressInputWithChainId: ParseAddressByChainIdInput = async args => {
  const { assetId, chainId, amountCryptoPrecision } = args
  const maybeParsedArgs = {
    assetId,
    maybeAddress: args.urlOrAddress,
    amountCryptoPrecision,
    chainId,
  }

  const isValidAddress = await validateAddress(maybeParsedArgs)
  // Valid address
  if (isValidAddress) {
    const vanityAddress = await reverseLookupVanityAddress(maybeParsedArgs)
    // Return address with vanity address lookup
    return {
      address: maybeParsedArgs.maybeAddress,
      vanityAddress,
      chainId,
      amountCryptoPrecision: maybeParsedArgs.amountCryptoPrecision,
    }
  }
  // Check if it's a vanity address
  const isVanityAddress = await validateVanityAddress(maybeParsedArgs)
  // Not a valid address or vanity address
  if (!isVanityAddress) return { address: '', vanityAddress: '', chainId }
  // Resolve vanity address
  const address = await resolveVanityAddress(maybeParsedArgs)
  return { address, vanityAddress: maybeParsedArgs.maybeAddress, chainId }
}
