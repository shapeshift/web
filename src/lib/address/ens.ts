// @ts-ignore TODO: add type declarations for ensjs module
import ENS, { getEnsAddress } from '@ensdomains/ensjs'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import memoize from 'lodash/memoize'
import { ethChainId } from 'test/mocks/accounts'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { getWeb3Provider } from 'lib/web3-provider'

import { ResolveVanityDomain, ResolveVanityDomainReturn, ValidateVanityDomain } from './address'

let makeEns: () => void
// getEnsAddress takes a magic number as string, networkId. 1 stands for mainnet
const ens = new Promise<void>(resolve => (makeEns = resolve)).then(async () => {
  const unchainedUrls = {
    ethereum: {
      httpUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
      wsUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
    },
  }

  const ethereumChainAdapter = new ChainAdapterManager(unchainedUrls).byChain(ChainTypes.Ethereum)
  const chainId = ethereumChainAdapter.getChainId()
  const chainIdReference = chainId.match(
    /^(?<chainIdNamespace>[-a-z0-9]{3,8}):(?<chainIdReference>[-a-zA-Z0-9]{1,32})$/,
  )?.groups?.chainIdReference
  return new ENS({ provider: getWeb3Provider(), ensAddress: getEnsAddress(chainIdReference) })
})

export const resolveEnsDomain: ResolveVanityDomain = async ({ value }) =>
  (await getChainAdapters().byChainId(ethChainId).validateAddress(value)).valid
    ? { address: value, error: false }
    : ensLookup(value)

// leave async such that this works with other async validators
export const validateEnsDomain: ValidateVanityDomain = async ({ value }) =>
  /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(value)

export const ensLookup = memoize(async (domain: string): Promise<ResolveVanityDomainReturn> => {
  makeEns()
  const ensInstance = await ens
  const lookupAddress = await ensInstance.name(domain).getAddress()
  if (lookupAddress === '0x0000000000000000000000000000000000000000') {
    return { address: null, error: true }
  }
  return { address: lookupAddress, error: false }
})

export const ensReverseLookup = memoize(
  async (
    address: string,
  ): Promise<{ name: string; error: false } | { name: null; error: true }> => {
    makeEns()
    const ensInstance = await ens
    const lookupName = await ensInstance.getName(address)
    if (!lookupName.name) return { name: null, error: true }
    return { name: lookupName.name, error: false }
  },
)
