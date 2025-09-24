import type { ParseAddressByChainIdInput, ParseAddressInput, ParseAddressResult } from './types'
import { validateAddress } from './validation'
import {
  resolveVanityAddress,
  reverseLookupVanityAddress,
  validateVanityAddress,
} from './vanityAddress'

import { knownChainIds } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

// Re-export types and functions for backward compatibility
export type {
  ParseAddressInputReturn,
  ResolveVanityAddress,
  ResolveVanityAddressReturn,
  ReverseLookupVanityAddress,
  ValidateVanityAddress,
} from './types'

// Re-export validation function
export { validateAddress } from './validation'

export const parseAddress = async ({
  address,
}: {
  address: string
}): Promise<ParseAddressResult> => {
  // Find which chain this plain address belongs to
  for (const chainId of knownChainIds) {
    try {
      const isValidAddress = await validateAddress({ chainId, maybeAddress: address })
      if (isValidAddress) {
        const adapter = getChainAdapterManager().get(chainId)
        if (!adapter) continue // Try next chain if no adapter

        const defaultAssetId = adapter.getFeeAssetId()
        return {
          chainId,
          value: address,
          assetId: defaultAssetId,
        }
      }
    } catch (error) {
      // Continue to next chain on validation errors
      continue
    }
  }

  // Validation failed for all ChainIds
  throw new Error('Address not found in QR code')
}


// Parses an address or vanity address for a **known** ChainId
export const parseAddressInputWithChainId: ParseAddressByChainIdInput = async args => {
  const { assetId, chainId, amountCryptoPrecision } = args
  // This function only handles addresses/ENS
  const maybeParsedArgs = {
    assetId,
    maybeAddress: args.urlOrAddress,
    amountCryptoPrecision,
    chainId,
  }

  const isValidAddress = await validateAddress(maybeParsedArgs)
  // we're dealing with a valid address
  if (isValidAddress) {
    const vanityAddress = await reverseLookupVanityAddress(maybeParsedArgs)
    // return a valid address, and a possibly blank or populated vanity address
    return {
      address: maybeParsedArgs.maybeAddress,
      vanityAddress,
      chainId,
      amountCryptoPrecision: maybeParsedArgs.amountCryptoPrecision,
    }
  }
  // at this point it's not a valid address, but may not be a vanity address
  const isVanityAddress = await validateVanityAddress(maybeParsedArgs)
  // it's neither a valid address nor a vanity address
  if (!isVanityAddress) return { address: '', vanityAddress: '', chainId }
  // at this point it's a valid vanity address, let's resolve it
  const address = await resolveVanityAddress(maybeParsedArgs)
  return { address, vanityAddress: maybeParsedArgs.maybeAddress, chainId }
}

// Parses an address or vanity address for an **unknown** ChainId, exhausting known ChainIds until we maybe find a match
export const parseAddressInput: ParseAddressInput = async args => {
  // This function only handles addresses/ENS
  for (const chainId of knownChainIds) {
    const parsedArgs = {
      assetId: args.assetId,
      chainId,
      maybeAddress: args.urlOrAddress,
      amountCryptoPrecision: args.amountCryptoPrecision,
    }

    const isValidAddress = await validateAddress(parsedArgs)
    // we're dealing with a valid address
    if (isValidAddress) {
      const vanityAddress = await reverseLookupVanityAddress(parsedArgs)
      // return a valid address, and a possibly blank or populated vanity address
      return { address: parsedArgs.maybeAddress, vanityAddress, chainId }
    }
    // at this point it's not a valid address, but may be a vanity address
    const isVanityAddress = await validateVanityAddress(parsedArgs)
    // it's neither a valid address nor a vanity address, try the next chainId
    if (!isVanityAddress) continue
    // at this point it may be a valid vanity address for this ChainId, let's resolve it
    const address = await resolveVanityAddress(parsedArgs)

    // All failed, try the next chainId
    if (!address) continue
    return { address, vanityAddress: parsedArgs.maybeAddress, chainId }
  }
}
