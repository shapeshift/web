// @ts-ignore TODO: add type declarations for ensjs module
import ENS, { getEnsAddress } from '@ensdomains/ensjs'
import memoize from 'lodash/memoize'
import { getWeb3Provider } from 'lib/web3-provider'

let maybeEns: ENS | null

const web3Provider = getWeb3Provider()

const getEnsInstance = (): ENS => {
  if (!maybeEns) {
    // getEnsAddress takes a magic number as string, networkId. 1 stands for mainnet
    maybeEns = new ENS({ provider: web3Provider, ensAddress: getEnsAddress('1') })
    return maybeEns!
  } else {
    return maybeEns!
  }
}

export const ensLookup = memoize(
  async (ensName: string): Promise<{ address: string; error: boolean }> => {
    const ensInstance = getEnsInstance()
    const lookupAddress = await ensInstance.name(ensName).getAddress()
    if (lookupAddress === '0x0000000000000000000000000000000000000000') {
      return { address: '', error: true }
    }
    return { address: lookupAddress, error: false }
  }
)

export const ensReverseLookup = memoize(
  async (address: string): Promise<{ name: string; error: boolean }> => {
    const ensInstance = getEnsInstance()
    const lookupName = await ensInstance.getName(address)
    if (!lookupName.name) {
      return { name: '', error: true }
    }
    return { name: lookupName.name, error: false }
  }
)
