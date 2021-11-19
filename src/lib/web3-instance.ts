import { getConfig } from 'config'
import Web3 from 'web3'

let maybeWeb3Provider: InstanceType<typeof Web3.providers.HttpProvider> | null
let maybeWeb3Instance: Web3 | null

export const getWeb3Instance = (): Web3 => {
  if (!maybeWeb3Provider) {
    maybeWeb3Provider = new Web3.providers.HttpProvider(getConfig().REACT_APP_ETHEREUM_NODE_URL)
    maybeWeb3Instance = new Web3(maybeWeb3Provider)
    return maybeWeb3Instance!
  } else {
    return maybeWeb3Instance!
  }
}
