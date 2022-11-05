import type { ChainId } from '@keepkey/caip'
import { avalancheChainId, ethChainId } from '@keepkey/caip'
import { getConfig } from 'config'
import Web3 from 'web3'

type HttpProvider = InstanceType<typeof Web3.providers.HttpProvider>

const web3ProviderMap: Map<ChainId, HttpProvider> = new Map()

const httpProviderByChainId = (chainId: ChainId): string => {
  switch (chainId) {
    case avalancheChainId:
      return getConfig().REACT_APP_AVALANCHE_NODE_URL
    case ethChainId:
    default:
      return getConfig().REACT_APP_ETHEREUM_NODE_URL
  }
}

export const getWeb3ProviderByChainId = (chainId: ChainId): HttpProvider => {
  if (!web3ProviderMap.get(chainId)) {
    web3ProviderMap.set(chainId, new Web3.providers.HttpProvider(httpProviderByChainId(chainId)))
    return web3ProviderMap.get(chainId)!
  } else {
    return web3ProviderMap.get(chainId)!
  }
}
