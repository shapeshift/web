import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { bchChainId, btcChainId, dogeChainId, ethChainId, ltcChainId } from '@shapeshiftoss/caip'
import type { Address } from '@wagmi/core'
import bip21 from 'bip21'
import { parse as parseEthUrl } from 'eth-url-parser'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { resolveEnsDomain, validateEnsDomain } from 'lib/address/ens'
import {
  resolveUnstoppableDomain,
  reverseLookupUnstoppableDomain,
  validateUnstoppableDomain,
} from 'lib/address/unstoppable-domains'
import { resolveYat, validateYat } from 'lib/address/yat'
import { logger } from 'lib/logger'
import { store } from 'state/store'
import type { Identity } from 'types/common'

import { ensReverseLookupShim } from './ens'

const moduleLogger = logger.child({ namespace: ['lib', 'address'] })

type VanityAddressValidatorsByChainId = {
  [k: ChainId]: ValidateVanityAddress[]
}

const CHAIN_ID_TO_URN_SCHEME: Record<ChainId, string> = {
  [ethChainId]: 'ethereum',
  [btcChainId]: 'bitcoin',
  [bchChainId]: 'bitcoincash',
  [dogeChainId]: 'dogecoin',
  [ltcChainId]: 'litecoin',
}
export const parseMaybeUrlByChainId: Identity<ParseAddressInputArgs> = ({
  assetId,
  chainId,
  value,
}) => {
  switch (chainId) {
    case ethChainId:
      try {
        const parsedUrl = parseEthUrl(value)

        return {
          assetId,
          value: !parsedUrl.parameters ? parsedUrl.target_address : value,
          chainId,
        }
      } catch (error) {
        moduleLogger.trace(error, 'cannot parse eip681 address')
      }
      break
    case btcChainId:
    case bchChainId:
    case dogeChainId:
    case ltcChainId:
      try {
        const urnScheme = CHAIN_ID_TO_URN_SCHEME[chainId]
        const parsedUrl = bip21.decode(value, urnScheme)
        return {
          assetId,
          value: parsedUrl.address,
          chainId,
        }
      } catch (error) {
        moduleLogger.trace(error, 'Cannot parse BIP-21 address')
        return {
          assetId,
          value,
          chainId,
        }
      }
    default:
      return { assetId, chainId, value }
  }

  return { assetId, chainId, value }
}

// validators - is a given value a valid vanity address, e.g. a .eth or a .crypto
const getVanityAddressValidatorsByChain = (): VanityAddressValidatorsByChainId => {
  const flags = store.getState().preferences.featureFlags

  return {
    [btcChainId]: [validateUnstoppableDomain],
    [ethChainId]: [
      ...(flags.Yat ? [validateYat] : []),
      validateEnsDomain,
      validateUnstoppableDomain,
    ],
  }
}

type ValidateVanityAddressArgs = {
  assetId?: AssetId
  value: string
  chainId: ChainId
}
type ValidateVanityAddressReturn = boolean
export type ValidateVanityAddress = (
  args: ValidateVanityAddressArgs,
) => Promise<ValidateVanityAddressReturn>

export const validateVanityAddress: ValidateVanityAddress = async args => {
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
export type ResolveVanityAddressArgs = {
  assetId?: AssetId
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

const getVanityResolversByChainId = (): VanityAddressResolversByChainId => {
  const flags = store.getState().preferences.featureFlags

  return {
    [btcChainId]: [resolveUnstoppableDomain],
    [ethChainId]: [...(flags.Yat ? [resolveYat] : []), resolveEnsDomain, resolveUnstoppableDomain],
  }
}

export const resolveVanityAddress: ResolveVanityAddress = async args => {
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
  return '' as Address
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
  assetId?: AssetId
  chainId: ChainId
  value: string
}
export type ParseAddressInputReturn = {
  address: string
  vanityAddress: string
}
export type ParseAddressInput = (args: ParseAddressInputArgs) => Promise<ParseAddressInputReturn>

export const parseAddressInput: ParseAddressInput = async args => {
  const parsedArgs = parseMaybeUrlByChainId(args)

  const isValidAddress = await validateAddress(parsedArgs)
  // we're dealing with a valid address
  if (isValidAddress) {
    const vanityAddress = await reverseLookupVanityAddress(parsedArgs)
    // return a valid address, and a possibly blank or populated vanity address
    return { address: parsedArgs.value, vanityAddress }
  }
  // at this point it's not a valid address, but may not be a vanity address
  const isVanityAddress = await validateVanityAddress(parsedArgs)
  // it's neither a valid address nor a vanity address
  if (!isVanityAddress) return { address: '', vanityAddress: '' }
  // at this point it's a valid vanity address, let's resolve it
  const address = await resolveVanityAddress(parsedArgs)
  return { address, vanityAddress: parsedArgs.value }
}
