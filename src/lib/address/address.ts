import { btcChainId, ChainId, ethChainId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { toChecksumAddress } from 'web3-utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { resolveEnsDomain, validateEnsDomain } from 'lib/address/ens'
import {
  resolveUnstoppableDomain,
  reverseLookupUnstoppableDomain,
  validateUnstoppableDomain,
} from 'lib/address/unstoppable-domains'
import { validateYat } from 'lib/address/yat'

import { ensReverseLookupShim } from './ens'

type VanityAddressValidatorsByChainId = {
  [k: ChainId]: ValidateVanityAddress[]
}

// validators - is a given value a valid vanity address, e.g. a .eth or a .crypto
const vanityAddressValidatorsByChain: VanityAddressValidatorsByChainId = {
  [btcChainId]: [validateUnstoppableDomain],
  [ethChainId]: [validateEnsDomain, validateUnstoppableDomain],
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
}

export const reverseLookupVanityAddress: ReverseLookupVanityAddress = async args => {
  const resolvers = reverseLookupResolversByChainId[args.chainId] ?? []
  for (const resolver of resolvers) {
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
    const adapter = getChainAdapterManager().get(chainId)
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
  const isYat = await validateYat(args)
  if (isYat) {
    const { data } = await axios.get(
      `https://octopus-app-mkjlj.ondigitalocean.app/emoji_id/${args.value}`,
    )
    if (data.error) return { address: '', vanityAddress: '' }

    const found = data.result.find(
      (emoji: { data: string; tag: string; hash: string }) => emoji.tag === '0x1004', // 0x1004 is eth address
    )

    if (!found) return { address: '', vanityAddress: '' }
    // data format: address|description|signature|default
    const yatAddress = toChecksumAddress(found.data.split('|')[0])

    const vanityAddress = await reverseLookupVanityAddress({
      value: yatAddress,
      chainId: args.chainId,
    })

    return { address: yatAddress, vanityAddress }
  }
  const isValidAddress = await validateAddress(args)
  // we're dealing with a valid address
  if (isValidAddress) {
    const vanityAddress = await reverseLookupVanityAddress(args)
    // return a valid address, and a possibly blank or populated vanity address
    return { address: args.value, vanityAddress }
  }
  // at this point it's not a valid address, but may not be a vanity address
  const isVanityAddress = await validateVanityAddress(args)
  // at this point it's a valid vanity address, let's resolve it
  if (isVanityAddress) {
    const address = await resolveVanityAddress(args)
    return { address, vanityAddress: args.value }
  }
  // it's neither a valid address nor a vanity address
  return { address: '', vanityAddress: '' }
}
