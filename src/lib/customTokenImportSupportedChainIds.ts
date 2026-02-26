import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  baseChainId,
  ethChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
} from '@shapeshiftoss/caip'

export const CUSTOM_TOKEN_IMPORT_SUPPORTED_CHAIN_IDS: ChainId[] = [
  ethChainId,
  polygonChainId,
  optimismChainId,
  arbitrumChainId,
  baseChainId,
  solanaChainId,
]
