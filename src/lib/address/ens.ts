import memoize from 'lodash/memoize'
import type { Address } from 'viem'
import { viemClient } from 'lib/viem-client'

import type {
  ResolveVanityAddress,
  ResolveVanityAddressReturn,
  ReverseLookupVanityAddress,
  ValidateVanityAddress,
} from './address'

export const resolveEnsDomain: ResolveVanityAddress = ({ maybeAddress: value }) => ensLookup(value)

// leave async such that this works with other async validators
export const validateEnsDomain: ValidateVanityAddress = ({ maybeAddress }) =>
  Promise.resolve(/^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(maybeAddress))

export const ensLookup = memoize(async (domain: string): Promise<ResolveVanityAddressReturn> => {
  const address = await viemClient.getEnsAddress({
    name: domain,
  })
  if (!address) return ''
  return address
})

export const ensReverseLookup = memoize(
  async (
    address: Address,
  ): Promise<{ name: string; error: false } | { name: null; error: true }> => {
    const lookupName = await viemClient.getEnsName({
      address,
    })
    if (!lookupName) return { name: null, error: true }
    return { name: lookupName, error: false }
  },
)

/**
 * TODO(0xdef1cafe): i can't be arsed refactoring other usages of this
 * right now to make it compile, so map the type sigs to the old lookup impl
 */
export const ensReverseLookupShim: ReverseLookupVanityAddress = async ({ maybeAddress }) => {
  const { name, error } = await ensReverseLookup(maybeAddress as Address)
  return error ? '' : name
}
