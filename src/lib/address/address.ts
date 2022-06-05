import { btcChainId, ChainId, cosmosChainId, ethChainId, osmosisChainId } from '@shapeshiftoss/caip'
import { resolveEnsDomain, validateEnsDomain } from 'lib/address/ens'
import {
  resolveUnstoppableDomain,
  validateUnstoppableDomain,
} from 'lib/address/unstoppable-domains'

type ValidatorsByChainId = {
  [k: ChainId]: ValidateVanityDomain[]
}

// validators - is a given value a valid vanity address, e.g. a .eth or a .crypto
const vanityValidatorsByChain: ValidatorsByChainId = {
  [btcChainId]: [validateUnstoppableDomain],
  [ethChainId]: [validateEnsDomain, validateUnstoppableDomain],
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

export type ResolveVanityDomainReturn =
  | { address: string; error: false }
  | { address: null; error: true }

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
      if (result.error) continue
      return result
    } catch (e) {}
  }
  return { address: null, error: true }
}
