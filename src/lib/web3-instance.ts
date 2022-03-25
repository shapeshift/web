import Web3 from 'web3'
import { getWeb3Provider } from 'lib/web3-provider'

let maybeWeb3Instance: Web3 | null

export const getWeb3Instance = (): Web3 => {
  const web3Provider = getWeb3Provider()
  if (!maybeWeb3Instance) {
    maybeWeb3Instance = new Web3(web3Provider)
    return maybeWeb3Instance!
  } else {
    return maybeWeb3Instance!
  }
}
