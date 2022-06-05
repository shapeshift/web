import { btcChainId, ChainId, ethChainId } from '@shapeshiftoss/caip'
import { resolveEnsDomain, validateEnsDomain } from 'lib/address/ens'
import {
  resolveUnstoppableDomain,
  validateUnstoppableDomain,
} from 'lib/address/unstoppable-domains'

// validators - is a given value a valid vanity address, e.g. a .eth or a .crypto
const validators = [validateEnsDomain, validateUnstoppableDomain]

type ValidateVanityDomainArgs = string
type ValidateVanityDomainReturn = boolean
export type ValidateVanityDomain = (
  args: ValidateVanityDomainArgs,
) => Promise<ValidateVanityDomainReturn>

export const validateVanityDomain: ValidateVanityDomain = async domain => {
  try {
    const results = await Promise.allSettled(validators.map(async v => v(domain)))
    return results.some(r => r.status === 'fulfilled' && r.value)
  } catch (e) {} // expected to fail validation often
  return false
}

// resolvers - given a vanity address and a chainId, resolve it to an on chain address
export type ResolveVanityDomainArgs = {
  chainId: ChainId
  domain: string
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

const resolversByChainId: ResolversByChainId = {
  [btcChainId]: [resolveUnstoppableDomain],
  [ethChainId]: [resolveEnsDomain, resolveUnstoppableDomain],
}

export const resolveVanityDomain: ResolveVanityDomain = async args => {
  for (const resolver of resolversByChainId[args.chainId]) {
    try {
      const result = await resolver(args)
      if (result.error) continue
      return result
    } catch (e) {}
  }
  return { address: null, error: true }
}
