import { ethChainId } from '@shapeshiftoss/caip'
import { providers } from 'ethers'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'
let maybeEthersProvider: providers.Web3Provider | undefined
// The provider we get from getWeb3Instance is a web3.js Provider
// But uniswap SDK needs a Web3Provider from ethers.js
export const getEthersProvider = () => {
  if (maybeEthersProvider) return maybeEthersProvider

  const provider = getWeb3InstanceByChainId(ethChainId).currentProvider

  maybeEthersProvider = new providers.Web3Provider(
    provider as providers.ExternalProvider, // TODO(gomes): Can we remove this casting?
  )

  return maybeEthersProvider
}
