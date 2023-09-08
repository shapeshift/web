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
import { providers } from 'ethers'

export const rpcUrlByChainId = (chainId: ChainId): string => {
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

const ethersProviders: Map<ChainId, providers.JsonRpcBatchProvider> = new Map()

export const getEthersProvider = (chainId = ethChainId): providers.JsonRpcBatchProvider => {
  if (!ethersProviders.has(chainId)) {
    const provider = new providers.JsonRpcBatchProvider(rpcUrlByChainId(chainId))
    ethersProviders.set(chainId, provider)
    return provider
  } else {
    return ethersProviders.get(chainId)!
  }
}
