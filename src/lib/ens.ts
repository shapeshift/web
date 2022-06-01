// @ts-ignore TODO: add type declarations for ensjs module
import ENS, { getEnsAddress } from '@ensdomains/ensjs'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import memoize from 'lodash/memoize'
import { getWeb3Provider } from 'lib/web3-provider'

let makeEns: () => void
// getEnsAddress takes a magic number as string, networkId. 1 stands for mainnet
const ens = new Promise<void>(resolve => (makeEns = resolve)).then(async () => {
  const unchainedUrls = {
    ethereum: {
      httpUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
      wsUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
      rpcUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
    },
  }

  const ethereumChainAdapter = new ChainAdapterManager(unchainedUrls).byChain(ChainTypes.Ethereum)
  const chainId = ethereumChainAdapter.getChainId()
  const chainIdReference = chainId.match(
    /^(?<chainIdNamespace>[-a-z0-9]{3,8}):(?<chainIdReference>[-a-zA-Z0-9]{1,32})$/,
  )?.groups?.chainIdReference
  return new ENS({ provider: await getWeb3Provider(), ensAddress: getEnsAddress(chainIdReference) })
})

export const ensLookup = memoize(
  async (
    ensName: string,
  ): Promise<{ address: string; error: false } | { address: null; error: true }> => {
    makeEns()
    const ensInstance = await ens
    const lookupAddress = await ensInstance.name(ensName).getAddress()
    if (lookupAddress === '0x0000000000000000000000000000000000000000') {
      return { address: null, error: true }
    }
    return { address: lookupAddress as string, error: false }
  },
)

export const ensReverseLookup = memoize(
  async (
    address: string,
  ): Promise<{ name: string; error: false } | { name: null; error: true }> => {
    makeEns()
    const ensInstance = await ens
    const lookupName = await ensInstance.getName(address)
    if (!lookupName.name) {
      return { name: null, error: true }
    }
    return { name: lookupName.name as string, error: false }
  },
)
