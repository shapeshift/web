import { getConfig as getEthereumConfig } from 'plugins/ethereum/config'
import Web3 from 'web3'

let maybeWeb3Provider: InstanceType<typeof Web3.providers.HttpProvider> | null

export const getWeb3Provider = () => {
  if (!maybeWeb3Provider) {
    maybeWeb3Provider = new Web3.providers.HttpProvider(
      getEthereumConfig().REACT_APP_ETHEREUM_NODE_URL,
    )
    return maybeWeb3Provider!
  } else {
    return maybeWeb3Provider!
  }
}
