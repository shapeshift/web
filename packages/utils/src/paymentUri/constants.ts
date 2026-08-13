import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  gnosisChainId,
  ltcChainId,
  mayachainChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
  thorchainChainId,
  tronChainId,
  zecChainId,
} from '@shapeshiftoss/caip'

export const CHAIN_ID_TO_URN_SCHEME: Record<ChainId, string> = {
  [ethChainId]: 'ethereum',
  [arbitrumChainId]: 'arbitrum',
  [optimismChainId]: 'optimism',
  [polygonChainId]: 'polygon',
  [bscChainId]: 'smartchain',
  [avalancheChainId]: 'avalanchec',
  [baseChainId]: 'base',
  [gnosisChainId]: 'xdai',
  [btcChainId]: 'bitcoin',
  [bchChainId]: 'bitcoincash',
  [dogeChainId]: 'dogecoin',
  [ltcChainId]: 'litecoin',
  [zecChainId]: 'zcash',
  [thorchainChainId]: 'thorchain',
  [cosmosChainId]: 'cosmos',
  [mayachainChainId]: 'mayachain',
  [solanaChainId]: 'solana',
  [tronChainId]: 'tron',
}

// Schemes we no longer emit but still have to read - 'doge' predates matching the one Dogecoin
// Core actually registers, and codes carrying it are already in the wild
const LEGACY_URN_SCHEME_TO_CHAIN_ID: Record<string, ChainId> = {
  doge: dogeChainId,
}

export const URN_SCHEME_TO_CHAIN_ID: Record<string, ChainId> = {
  ...Object.fromEntries(
    Object.entries(CHAIN_ID_TO_URN_SCHEME).map(([chainId, scheme]) => [scheme, chainId]),
  ),
  ...LEGACY_URN_SCHEME_TO_CHAIN_ID,
}
