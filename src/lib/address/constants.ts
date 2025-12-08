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
  [dogeChainId]: 'doge',
  [ltcChainId]: 'litecoin',
  [zecChainId]: 'zcash',
  [thorchainChainId]: 'thorchain',
  [cosmosChainId]: 'cosmos',
  [mayachainChainId]: 'mayachain',
  [solanaChainId]: 'solana',
  [tronChainId]: 'tron',
}

export const URN_SCHEME_TO_CHAIN_ID = Object.fromEntries(
  Object.entries(CHAIN_ID_TO_URN_SCHEME).map(([chainId, scheme]) => [scheme, chainId]),
)

export const DANGEROUS_ETH_URL_ERROR = 'modals.send.errors.qrDangerousEthUrl'
export const EMPTY_ADDRESS_ERROR = 'Address is required'
