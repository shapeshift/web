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
