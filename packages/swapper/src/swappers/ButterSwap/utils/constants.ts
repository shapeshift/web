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

export const BUTTER_SWAPPER_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
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

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
