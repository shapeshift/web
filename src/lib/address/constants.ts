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
  thorchainChainId,
} from '@shapeshiftoss/caip'

// URN scheme mapping for all chains (used for BIP-21 and EIP-681)
export const CHAIN_ID_TO_URN_SCHEME: Record<ChainId, string> = {
  // EVM chains use 'ethereum' as the universal scheme for EIP-681
  [ethChainId]: 'ethereum',
  [arbitrumChainId]: 'arbitrum',
  [optimismChainId]: 'optimism',
  [polygonChainId]: 'polygon',
  [bscChainId]: 'smartchain',
  [avalancheChainId]: 'avalanchec',
  [baseChainId]: 'base',
  [gnosisChainId]: 'xdai',
  // UTXO chains use their specific schemes for BIP-21
  [btcChainId]: 'bitcoin',
  [bchChainId]: 'bitcoincash',
  [dogeChainId]: 'doge',
  [ltcChainId]: 'litecoin',
  // Cosmos chains use their specific schemes for BIP-21
  [thorchainChainId]: 'thorchain',
  [cosmosChainId]: 'cosmos',
  [mayachainChainId]: 'mayachain',
}

export const URN_SCHEME_TO_CHAIN_ID = Object.fromEntries(
  Object.entries(CHAIN_ID_TO_URN_SCHEME).map(([chainId, scheme]) => [scheme, chainId]),
)

export const DANGEROUS_ETH_URL_ERROR = 'modals.send.errors.qrDangerousEthUrl'
