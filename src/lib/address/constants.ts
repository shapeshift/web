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
} from '@shapeshiftoss/caip'

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
  [btcChainId]: 'bitcoin',
  [bchChainId]: 'bitcoincash',
  [dogeChainId]: 'doge',
  [ltcChainId]: 'litecoin',
  [thorchainChainId]: 'thorchain',
  [cosmosChainId]: 'cosmos',
  [mayachainChainId]: 'mayachain',
  [solanaChainId]: 'solana',
}

export const URN_SCHEME_TO_CHAIN_ID = Object.fromEntries(
  Object.entries(CHAIN_ID_TO_URN_SCHEME).map(([chainId, scheme]) => [scheme, chainId]),
)

export const DANGEROUS_ETH_URL_ERROR = 'modals.send.errors.qrDangerousEthUrl'
