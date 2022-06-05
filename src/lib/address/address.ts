import { resolveEnsDomain, validateEnsDomain } from 'lib/address/ens'
import {
  resolveUnstoppableDomain,
  validateUnstoppableDomain,
} from 'lib/address/unstoppable-domains'

export type ResolveVanityDomainArgs = {
  domain: string
}
export type ResolveVanityDomainReturn =
  | { address: string; error: false }
  | { address: null; error: true }
export type ResolveVanityDomain = (
  args: ResolveVanityDomainArgs,
) => Promise<ResolveVanityDomainReturn>

const validators = [validateEnsDomain, validateUnstoppableDomain]
const resolvers = [resolveEnsDomain, resolveUnstoppableDomain]

export const resolveVanityDomain: ResolveVanityDomain = async ({ domain }) => {
  for (const resolver of resolvers) {
    try {
      const result = await resolver({ domain })
      if (result.error) continue
      return result
    } catch (e) {}
  }
  return { address: null, error: true }
}

type ValidateVanityDomainArgs = string

type ValidateVanityDomainReturn = boolean

export type ValidateVanityDomain = (
  args: ValidateVanityDomainArgs,
) => Promise<ValidateVanityDomainReturn>
export const validateVanityDomain: ValidateVanityDomain = async hostname =>
  (await Promise.all(validators.map(async v => v(hostname)))).some(Boolean)
