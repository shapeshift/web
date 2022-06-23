import ENS, { getEnsAddress } from '@ensdomains/ensjs'
import { AddressZero } from '@ethersproject/constants'
import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import memoize from 'lodash/memoize'
import { web3Provider } from 'lib/web3-provider'

import { ReverseLookupVanityAddress } from './address'
import { ResolveVanityAddress, ResolveVanityAddressReturn, ValidateVanityAddress } from './address'

const ens = new ENS({
  provider: web3Provider,
  ensAddress: getEnsAddress(CHAIN_REFERENCE.EthereumMainnet),
})

export const resolveEnsDomain: ResolveVanityAddress = async ({ value }) => ensLookup(value)

// leave async such that this works with other async validators
export const validateEnsDomain: ValidateVanityAddress = async ({ value }) =>
  /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(value)

export const ensLookup = memoize(async (domain: string): Promise<ResolveVanityAddressReturn> => {
  const address = await ens.name(domain).getAddress()
  if (address === AddressZero) return ''
  return address
})

export const ensReverseLookup = memoize(
  async (
    address: string,
  ): Promise<{ name: string; error: false } | { name: null; error: true }> => {
    const lookupName = await ens.getName(address)
    if (!lookupName.name) return { name: null, error: true }
    return { name: lookupName.name, error: false }
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
