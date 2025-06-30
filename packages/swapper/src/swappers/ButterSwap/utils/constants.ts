import {
  arbitrumChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  ethChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'

import type { SupportedChainIds } from '../../../types'

export const BUTTERSWAP_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: [
    ethChainId,
    arbitrumChainId,
    optimismChainId,
    bscChainId,
    polygonChainId,
    bchChainId,
    btcChainId,
  ],
  buy: [
    ethChainId,
    arbitrumChainId,
    optimismChainId,
    bscChainId,
    polygonChainId,
    bchChainId,
    btcChainId,
  ],
}

export const DEFAULT_BUTTERSWAP_AFFILIATE_BPS = 50

const BUTTERSWAP_AFFILIATE = '' // TODO: add affiliate

export const makeButterSwapAffiliate = (affiliateBps: string): string | undefined => {
  if (!BUTTERSWAP_AFFILIATE) return undefined
  return `${BUTTERSWAP_AFFILIATE}:${affiliateBps}`
}
