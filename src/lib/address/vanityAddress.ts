import { ethChainId } from '@shapeshiftoss/caip'
import type { Address } from 'viem'

import { ensReverseLookupShim } from './ens'
import type {
  ResolveVanityAddress,
  ResolveVanityAddressArgs,
  ResolveVanityAddressReturn,
  ReverseLookupVanityAddress,
  ReverseLookupVanityAddressArgs,
  ReverseLookupVanityAddressReturn,
  ReverseResolversByChainId,
  ValidateVanityAddress,
  ValidateVanityAddressArgs,
  ValidateVanityAddressReturn,
  VanityAddressResolversByChainId,
  VanityAddressValidatorsByChainId,
} from './types'

import { resolveEnsDomain, validateEnsDomain } from '@/lib/address/ens'

// validators - is a given value a valid vanity address, e.g. a .eth or a .crypto
const getVanityAddressValidatorsByChain = (): VanityAddressValidatorsByChainId => {
  return {
    [ethChainId]: [validateEnsDomain],
  }
}

export const validateVanityAddress: ValidateVanityAddress = async (
  args: ValidateVanityAddressArgs,
): Promise<ValidateVanityAddressReturn> => {
  const vanityAddressValidatorsByChain = getVanityAddressValidatorsByChain()
  const validators = vanityAddressValidatorsByChain[args.chainId] ?? []
  for (const validator of validators) {
    try {
      const result = await validator(args)
      if (result) return result
    } catch (e) {} // expected
  }
  return false
}

// resolvers - given a vanity address and a chainId, resolve it to an on chain address
const getVanityResolversByChainId = (): VanityAddressResolversByChainId => {
  return {
    [ethChainId]: [resolveEnsDomain],
  }
}

export const resolveVanityAddress: ResolveVanityAddress = async (
  args: ResolveVanityAddressArgs,
): Promise<ResolveVanityAddressReturn> => {
  const vanityResolversByChainId = getVanityResolversByChainId()
  for (const resolver of vanityResolversByChainId[args.chainId]) {
    try {
      const result = await resolver(args)
      if (result) return result
    } catch (e) {}
  }
  return ''
}

// reverse search - given a on chain address, resolve it to a vanity address
const reverseLookupResolversByChainId: ReverseResolversByChainId = {
  [ethChainId]: [ensReverseLookupShim],
}

export const reverseLookupVanityAddress: ReverseLookupVanityAddress = async (
  args: ReverseLookupVanityAddressArgs,
): Promise<ReverseLookupVanityAddressReturn> => {
  const resolvers = reverseLookupResolversByChainId[args.chainId] ?? []
  for (const resolver of resolvers) {
    try {
      const result = await resolver(args)
      if (result) return result
    } catch (e) {}
  }
  return '' as Address
}
