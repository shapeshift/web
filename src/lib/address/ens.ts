import { CHAIN_REFERENCE } from '@keepkey/caip'
import { fetchEnsAddress, fetchEnsName } from '@wagmi/core'
import memoize from 'lodash/memoize'

import type {
  ResolveVanityAddress,
  ResolveVanityAddressReturn,
  ReverseLookupVanityAddress,
  ValidateVanityAddress,
} from './address'

export const resolveEnsDomain: ResolveVanityAddress = async ({ value }) => ensLookup(value)

// leave async such that this works with other async validators
export const validateEnsDomain: ValidateVanityAddress = async ({ value }) =>
  /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(value)

export const ensLookup = memoize(async (domain: string): Promise<ResolveVanityAddressReturn> => {
  const address = await fetchEnsAddress({
    name: domain,
    chainId: Number(CHAIN_REFERENCE.EthereumMainnet),
  })
  if (!address) return ''
  return address
})

export const ensReverseLookup = memoize(
  async (
    address: string,
  ): Promise<{ name: string; error: false } | { name: null; error: true }> => {
    const lookupName = await fetchEnsName({
      address,
      chainId: Number(CHAIN_REFERENCE.EthereumMainnet),
    })
    if (!lookupName) return { name: null, error: true }
    return { name: lookupName, error: false }
  },
)

/**
 * TODO(0xdef1cafe): i can't be arsed refactoring other usages of this
 * right now to make it compile, so map the type sigs to the old lookup impl
 */
export const ensReverseLookupShim: ReverseLookupVanityAddress = async ({ value: address }) => {
  const { name, error } = await ensReverseLookup(address)
  return error ? '' : name
}
