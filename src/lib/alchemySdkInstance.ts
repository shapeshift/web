import type { ChainId } from '@shapeshiftoss/caip'
import { ethChainId, optimismChainId, polygonChainId } from '@shapeshiftoss/caip'
import { Alchemy, Network } from 'alchemy-sdk'
import { getConfig } from 'config'

const alchemyInstanceMap: Map<ChainId, Alchemy> = new Map()

export const getAlchemyInstanceByChainId = (chainId: ChainId): Alchemy => {
  if (alchemyInstanceMap.get(chainId)) return alchemyInstanceMap.get(chainId)!

  const apiKey = (() => {
    switch (chainId) {
      case polygonChainId:
        return getConfig().REACT_APP_ALCHEMY_POLYGON_JAYPEGS_API_KEY
      case ethChainId:
        return getConfig().REACT_APP_ALCHEMY_ETHEREUM_JAYPEGS_API_KEY
      case optimismChainId:
        return getConfig().REACT_APP_ALCHEMY_OPTIMISM_JAYPEGS_API_KEY
      default:
        return undefined
    }
  })()

  const network = (() => {
    switch (chainId) {
      case polygonChainId:
        return Network.MATIC_MAINNET
      case ethChainId:
        return Network.ETH_MAINNET
      case optimismChainId:
        return Network.OPT_MAINNET
      default:
        return undefined
    }
  })()

  if (!apiKey || !network) throw new Error(`Cannot get Alchemy Instance for chainId: ${chainId}`)

  const config = {
    apiKey,
    network,
  }

  alchemyInstanceMap.set(chainId, new Alchemy(config))

  return alchemyInstanceMap.get(chainId)!
}
