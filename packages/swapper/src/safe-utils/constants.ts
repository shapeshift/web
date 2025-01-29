import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'

export const ChainIdToSafeBaseUrl: Partial<Record<ChainId, string>> = {
  [ethChainId]: 'https://safe-transaction-mainnet.safe.global',
  [avalancheChainId]: 'https://safe-transaction-avalanche.safe.global',
  [optimismChainId]: 'https://safe-transaction-optimism.safe.global',
  [bscChainId]: 'https://safe-transaction-bsc.safe.global',
  [polygonChainId]: 'https://safe-transaction-polygon.safe.global',
  [gnosisChainId]: 'https://safe-transaction-gnosis-chain.safe.global',
  [arbitrumChainId]: 'https://safe-transaction-arbitrum.safe.global',
  [baseChainId]: 'https://safe-transaction-base.safe.global',
}
