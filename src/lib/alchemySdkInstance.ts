import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  baseChainId,
  ethChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import { Alchemy, Network } from 'alchemy-sdk'
import { getConfig } from 'config'

const alchemyInstanceMap: Map<ChainId, Alchemy> = new Map()

export const ALCHEMY_SDK_SUPPORTED_CHAIN_IDS = [
  ethChainId,
  polygonChainId,
  optimismChainId,
  arbitrumChainId,
  baseChainId,
] as const

export const getAlchemyInstanceByChainId = (chainId: ChainId): Alchemy => {
  // Note, make sure to not unify this guy and `instance` below.
  // This is a set, not an array, calling .set() will not automagically update `maybeInstance` to the new reference
  // This should probably be an Array for dev QoL but cba to change it as part of this eslint PR
  const maybeInstance = alchemyInstanceMap.get(chainId)
  if (maybeInstance) return maybeInstance

  const apiKey = (() => {
    switch (chainId) {
      case polygonChainId:
      case ethChainId:
      case optimismChainId:
      case arbitrumChainId:
      case baseChainId:
        return getConfig().REACT_APP_ALCHEMY_API_KEY
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
      case arbitrumChainId:
        return Network.ARB_MAINNET
      case baseChainId:
        return Network.BASE_MAINNET
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

  const instance = alchemyInstanceMap.get(chainId)

  if (!instance) throw new Error(`Cannot get Alchemy Instance for chainId: ${chainId}`)

  return instance
}
