import { getConfig } from 'config'
import Web3 from 'web3'

let maybeWeb3Provider: InstanceType<any> | null

export const getWeb3Provider = () => {
  if (!maybeWeb3Provider) {
    maybeWeb3Provider = new Web3.providers.HttpProvider(getConfig().REACT_APP_ETHEREUM_NODE_URL)
    return maybeWeb3Provider!
  } else {
    return maybeWeb3Provider!
  }
}
