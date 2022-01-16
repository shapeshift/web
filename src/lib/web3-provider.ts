import { getConfig } from 'config'
import type Web3 from 'web3'

let maybeWeb3Provider: InstanceType<typeof Web3.providers.HttpProvider> | null

export const getWeb3Provider = async () => {
  if (!maybeWeb3Provider) {
    const web3 = (await import('web3')).default
    maybeWeb3Provider = new web3.providers.HttpProvider(getConfig().REACT_APP_ETHEREUM_NODE_URL)
    return maybeWeb3Provider!
  } else {
    return maybeWeb3Provider!
  }
}
