import type { ParseAddressByChainIdInput, ParseAddressResult } from './types'
import { validateAddress } from './validation'
import {
  resolveVanityAddress,
  reverseLookupVanityAddress,
  validateVanityAddress,
} from './vanityAddress'

import { knownChainIds } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const parseAddress = async ({
  address,
}: {
  address: string
}): Promise<ParseAddressResult> => {
  // Iterate over supportedChainIds
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
