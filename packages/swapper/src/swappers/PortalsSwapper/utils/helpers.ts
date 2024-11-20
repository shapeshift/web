import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  binanceChainId,
  type ChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'

import type { PortalsSupportedChainId } from '../types'
import { PortalsSupportedChainIds } from '../types'

export const isSupportedChainId = (chainId: ChainId): chainId is PortalsSupportedChainId => {
  return PortalsSupportedChainIds.includes(chainId as PortalsSupportedChainId)
}

export const getPortalsRouterAddressByChainId = (chainId: PortalsSupportedChainId): string => {
  switch (chainId) {
    case polygonChainId:
      return '0xC74063fdb47fe6dCE6d029A489BAb37b167Da57f'
    case ethChainId:
      return '0xbf5a7f3629fb325e2a8453d595ab103465f75e62'
    case avalancheChainId:
      return '0xbf5A7F3629fB325E2a8453D595AB103465F75E62'
    case binanceChainId:
      return '0x34b6a821d2f26c6b7cdb01cd91895170c6574a0d'
    case optimismChainId:
      return '0x43838f0c0d499f5c3101589f0f452b1fc7515178'
    case arbitrumChainId:
      return '0x34b6a821d2f26c6b7cdb01cd91895170c6574a0d'
    case baseChainId:
      return '0xb0324286b3ef7dddc93fb2ff7c8b7b8a3524803c'
    case gnosisChainId:
      return '0x8e74454b2cf2f6cc2a06083ef122187551cf391c'
    default:
      throw new Error(`Router address not found for chainId: ${chainId}`)
  }
}
