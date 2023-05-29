import type { ChainId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import Web3 from 'web3'

type HttpProvider = InstanceType<typeof Web3.providers.HttpProvider>

const web3ProviderMap: Map<ChainId, HttpProvider> = new Map()

export const httpProviderByChainId = (chainId: ChainId): string => {
  switch (chainId) {
    case avalancheChainId:
      return getConfig().REACT_APP_AVALANCHE_NODE_URL
    case optimismChainId:
      return getConfig().REACT_APP_OPTIMISM_NODE_URL
    case bscChainId:
      return getConfig().REACT_APP_BNBSMARTCHAIN_NODE_URL
    case polygonChainId:
      return getConfig().REACT_APP_POLYGON_NODE_URL
    case gnosisChainId:
      return getConfig().REACT_APP_GNOSIS_NODE_URL
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
