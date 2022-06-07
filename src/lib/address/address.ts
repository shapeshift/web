import { btcChainId, ChainId, cosmosChainId, ethChainId, osmosisChainId } from '@shapeshiftoss/caip'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { resolveEnsDomain, validateEnsDomain } from 'lib/address/ens'
import {
  resolveUnstoppableDomain,
  validateUnstoppableDomain,
} from 'lib/address/unstoppable-domains'

import { ensReverseLookupShim } from './ens'

type ValidatorsByChainId = {
  [k: ChainId]: ValidateVanityDomain[]
}

// validators - is a given value a valid vanity address, e.g. a .eth or a .crypto
const vanityValidatorsByChain: ValidatorsByChainId = {
  [btcChainId]: [validateUnstoppableDomain],
  [ethChainId]: [validateEnsDomain, validateUnstoppableDomain],
  [cosmosChainId]: [],
  [osmosisChainId]: [],
}

type ValidateVanityDomainArgs = {
  value: string
  chainId: ChainId
}
type ValidateVanityDomainReturn = boolean
export type ValidateVanityDomain = (
  args: ValidateVanityDomainArgs,
) => Promise<ValidateVanityDomainReturn>

export const validateVanityDomain: ValidateVanityDomain = async args => {
  for (const validator of vanityValidatorsByChain[args.chainId]) {
    try {
      return validator(args)
    } catch (e) {} // expected
  }
  return false
}

// resolvers - given a vanity address and a chainId, resolve it to an on chain address
export type ResolveVanityDomainArgs = {
  chainId: ChainId
  value: string // may be any type of vanity address, e.g. a .eth or a .crypto, or a regular address on any chain
}

export type ResolveVanityDomainReturn = string

export type ResolveVanityDomain = (
  args: ResolveVanityDomainArgs,
) => Promise<ResolveVanityDomainReturn>

type ResolversByChainId = {
  [k: ChainId]: ResolveVanityDomain[]
}

const vanityResolversByChainId: ResolversByChainId = {
  [btcChainId]: [resolveUnstoppableDomain],
  [ethChainId]: [resolveEnsDomain, resolveUnstoppableDomain],
  [cosmosChainId]: [],
  [osmosisChainId]: [],
}

export const resolveVanityDomain: ResolveVanityDomain = async args => {
  for (const resolver of vanityResolversByChainId[args.chainId]) {
    try {
      const result = await resolver(args)
      if (result) return result
    } catch (e) {}
  }
  return ''
}

// reverse search - given a on chain address, resolve it to a vanity address
type ReverseLookupVanityDomainArgs = {
  chainId: ChainId
  value: string
}
export type ReverseLookupVanityDomainReturn = string
export type ReverseLookupVanityDomain = (
  args: ReverseLookupVanityDomainArgs,
) => Promise<ReverseLookupVanityDomainReturn>

type ReverseResolversByChainId = {
  [k: ChainId]: ReverseLookupVanityDomain[]
}

const reverseLookupResolversByChainId: ReverseResolversByChainId = {
  [btcChainId]: [],
  [ethChainId]: [ensReverseLookupShim],
  [cosmosChainId]: [],
  [osmosisChainId]: [],
}

export const reverseLookupVanityDomain: ReverseLookupVanityDomain = async args => {
  for (const resolver of reverseLookupResolversByChainId[args.chainId]) {
    try {
      const result = await resolver(args)
      if (result) return result
    } catch (e) {}
  }
  return ''
}

// validate a given address
type ValidateAddressArgs = {
  chainId: ChainId
  value: string
}
type ValidateAddressReturn = boolean
export type ValidateAddress = (args: ValidateAddressArgs) => Promise<ValidateAddressReturn>

export const validateAddress: ValidateAddress = async ({ chainId, value }) => {
  try {
    return (await getChainAdapters().byChainId(chainId).validateAddress(value)).valid
  } catch (e) {
    return false
  }
}

/**
 * given a value, which may be invalid input, a valid address, or a variety of vanity domains
 * and a chainId, return an object containing and address and vanityAddress
 * which may both be empty strings, one may be empty, or both may be populated
 */
type ParseAddressInputArgs = {
  chainId: ChainId
  value: string
}
export type ParseAddressInputReturn = {
  address: string
  vanityAddress: string
}
export type ParseAddressInput = (args: ParseAddressInputArgs) => Promise<ParseAddressInputReturn>

export const parseAddressInput: ParseAddressInput = async args => {
  const isValidAddress = await validateAddress(args)
  // we're dealing with a valid address
  if (isValidAddress) {
    const vanityAddress = await reverseLookupVanityDomain(args)
    // return a valid address, and a possibly blank or populated vanity address
    return { address: args.value, vanityAddress }
  }
  // at this point it's not a valid address, but may not be a vanity address
  const isVanityAddress = await validateVanityDomain(args)
  // it's neither a valid address nor a vanity address
  if (!isVanityAddress) return { address: '', vanityAddress: '' }
  // at this point it's a valid vanity address, let's resolve it
  const address = await resolveVanityDomain(args)
  return { address, vanityAddress: args.value }
}
