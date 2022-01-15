// @ts-ignore TODO: add type declarations for ensjs module
import ENS, { getEnsAddress } from '@ensdomains/ensjs'
import { getWeb3Provider } from 'lib/web3-provider'

let maybeEns: ENS | null

const web3Provider = getWeb3Provider()

export const getEnsInstance = (): ENS => {
  if (!maybeEns) {
    maybeEns = new ENS({ provider: web3Provider, ensAddress: getEnsAddress('1') })
    return maybeEns!
  } else {
    return maybeEns!
  }
}
