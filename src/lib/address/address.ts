import { btcChainId, ChainId, cosmosChainId, ethChainId, osmosisChainId } from '@shapeshiftoss/caip'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { resolveEnsDomain, validateEnsDomain } from 'lib/address/ens'
import {
  resolveUnstoppableDomain,
  reverseLookupUnstoppableDomain,
  validateUnstoppableDomain,
} from 'lib/address/unstoppable-domains'

import { ensReverseLookupShim } from './ens'

type VanityAddressValidatorsByChainId = {
  [k: ChainId]: ValidateVanityAddress[]
}

// validators - is a given value a valid vanity address, e.g. a .eth or a .crypto
const vanityAddressValidatorsByChain: VanityAddressValidatorsByChainId = {
  [btcChainId]: [validateUnstoppableDomain],
  [ethChainId]: [validateEnsDomain, validateUnstoppableDomain],
  [cosmosChainId]: [],
  [osmosisChainId]: [],
}

type ValidateVanityAddressArgs = {
  value: string
  chainId: ChainId
}
type ValidateVanityAddressReturn = boolean
export type ValidateVanityAddress = (
  args: ValidateVanityAddressArgs,
) => Promise<ValidateVanityAddressReturn>

export const validateVanityAddress: ValidateVanityAddress = async args => {
  for (const validator of vanityAddressValidatorsByChain[args.chainId]) {
    try {
      const result = await validator(args)
      if (result) return result
    } catch (e) {} // expected
  }
  return false
}

// resolvers - given a vanity address and a chainId, resolve it to an on chain address
export type ResolveVanityAddressArgs = {
  chainId: ChainId
  value: string // may be any type of vanity address, e.g. a .eth or a .crypto, or a regular address on any chain
}

export type ResolveVanityAddressReturn = string

export type ResolveVanityAddress = (
  args: ResolveVanityAddressArgs,
) => Promise<ResolveVanityAddressReturn>

type VanityAddressResolversByChainId = {
  [k: ChainId]: ResolveVanityAddress[]
}

const vanityResolversByChainId: VanityAddressResolversByChainId = {
  [btcChainId]: [resolveUnstoppableDomain],
  [ethChainId]: [resolveEnsDomain, resolveUnstoppableDomain],
  [cosmosChainId]: [],
  [osmosisChainId]: [],
}

export const resolveVanityAddress: ResolveVanityAddress = async args => {
  for (const resolver of vanityResolversByChainId[args.chainId]) {
    try {
      const result = await resolver(args)
      if (result) return result
    } catch (e) {}
  }
  return ''
}

// reverse search - given a on chain address, resolve it to a vanity address
type ReverseLookupVanityAddressArgs = {
  chainId: ChainId
  value: string
}
export type ReverseLookupVanityAddressReturn = string
export type ReverseLookupVanityAddress = (
  args: ReverseLookupVanityAddressArgs,
) => Promise<ReverseLookupVanityAddressReturn>

type ReverseResolversByChainId = {
  [k: ChainId]: ReverseLookupVanityAddress[]
}

const reverseLookupResolversByChainId: ReverseResolversByChainId = {
  [btcChainId]: [reverseLookupUnstoppableDomain],
  [ethChainId]: [ensReverseLookupShim, reverseLookupUnstoppableDomain],
  [cosmosChainId]: [],
  [osmosisChainId]: [],
}

export const reverseLookupVanityAddress: ReverseLookupVanityAddress = async args => {
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
    const adapter = getChainAdapters().get(chainId)
    if (!adapter) return false
    return (await adapter.validateAddress(value)).valid
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
    const vanityAddress = await reverseLookupVanityAddress(args)
    // return a valid address, and a possibly blank or populated vanity address
    return { address: args.value, vanityAddress }
  }
  // at this point it's not a valid address, but may not be a vanity address
  const isVanityAddress = await validateVanityAddress(args)
  // it's neither a valid address nor a vanity address
  if (!isVanityAddress) return { address: '', vanityAddress: '' }
  // at this point it's a valid vanity address, let's resolve it
  const address = await resolveVanityAddress(args)
  return { address, vanityAddress: args.value }
}
