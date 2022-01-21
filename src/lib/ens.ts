// @ts-ignore TODO: add type declarations for ensjs module
import ENS, { getEnsAddress } from '@ensdomains/ensjs'
import memoize from 'lodash/memoize'
import { getWeb3Provider } from 'lib/web3-provider'

let makeEns: () => void
// getEnsAddress takes a magic number as string, networkId. 1 stands for mainnet
const ens = new Promise<void>(resolve => (makeEns = resolve)).then(async () => {
  return new ENS({ provider: await getWeb3Provider(), ensAddress: getEnsAddress('1') })
})

export const ensLookup = memoize(
  async (ensName: string): Promise<{ address: string } | { address: null; error: true }> => {
    makeEns()
    const ensInstance = await ens
    const lookupAddress = await ensInstance.name(ensName).getAddress()
    if (lookupAddress === '0x0000000000000000000000000000000000000000') {
      return { address: null, error: true }
    }
    return { address: lookupAddress }
  }
)

export const ensReverseLookup = memoize(
  async (address: string): Promise<{ name: string } | { name: null; error: true }> => {
    makeEns()
    const ensInstance = await ens
    const lookupName = await ensInstance.getName(address)
    if (!lookupName.name) {
      return { name: null, error: true }
    }
    return { name: lookupName.name }
  }
)
