import { getConfig } from 'config'
import Web3 from 'web3'

export const web3Provider: InstanceType<typeof Web3.providers.HttpProvider> =
  new Web3.providers.HttpProvider(getConfig().REACT_APP_ETHEREUM_NODE_URL)
