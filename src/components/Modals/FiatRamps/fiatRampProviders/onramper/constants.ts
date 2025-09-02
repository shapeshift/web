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
  optimismChainId,
  polygonChainId,
  solanaChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'

import type { CommonFiatCurrencies } from '../../config'

export const SUPPORTED_ONRAMPER_FIAT_CURRENCIES: CommonFiatCurrencies[] = [
  'AOA',
  'AUD',
  'BBD',
  'BZD',
  'BMD',
  'BRL',
  'GBP',
  'BND',
  'BGN',
  'CAD',
  'XAF',
  'CLP',
  'CNY',
  'COP',
  'KMF',
  'CRC',
  'HRK',
  'CZK',
  'DKK',
  'DJF',
  'DOP',
  'XCD',
  'EGP',
  'EUR',
  'FKP',
  'FJD',
  'GEL',
  'GHS',
  'GIP',
  'GTQ',
  'HNL',
  'HKD',
  'HUF',
  'ISK',
  'IDR',
  'ILS',
  'JMD',
  'JPY',
  'JOD',
  'KZT',
  'KES',
  'KWD',
  'KGS',
  'MGA',
  'MWK',
  'MYR',
  'MRU',
  'MXN',
  'MDL',
  'MAD',
  'MZN',
  'TWD',
  'NZD',
  'NGN',
  'NOK',
  'OMR',
  'PKR',
  'PGK',
  'PYG',
  'PEN',
  'PHP',
  'PLN',
  'RON',
  'RWF',
  'STN',
  'SCR',
  'SGD',
  'SBD',
  'ZAR',
  'KRW',
  'LKR',
  'SRD',
  'SZL',
  'SEK',
  'CHF',
  'TJS',
  'TZS',
  'THB',
  'TOP',
  'TRY',
  'TMT',
  'UGX',
  'USD',
  'UYU',
  'VND',
]

// Base mapping from ChainId to Onramper network names
export const CHAIN_ID_TO_ONRAMPER_NETWORK: Record<ChainId, string> = {
  // Bitcoin networks
  [btcChainId]: 'bitcoin',
  [bchChainId]: 'bitcoincash',
  [dogeChainId]: 'dogecoin',
  [ltcChainId]: 'litecoin',

  // Ethereum networks
  [ethChainId]: 'ethereum',
  [avalancheChainId]: 'avaxc',
  [optimismChainId]: 'optimism',
  [bscChainId]: 'bsc',
  [polygonChainId]: 'polygon',
  [gnosisChainId]: 'gnosis',
  [arbitrumChainId]: 'arbitrum',
  [baseChainId]: 'base',

  // Cosmos networks
  [cosmosChainId]: 'cosmos',
  [thorchainChainId]: 'thorchain',

  // Solana
  [solanaChainId]: 'solana',
} as const

// Inverted mapping from Onramper network names to ChainIds
export const ONRAMPER_NETWORK_TO_CHAIN_ID: Record<string, ChainId> = Object.fromEntries(
  Object.entries(CHAIN_ID_TO_ONRAMPER_NETWORK).map(([chainId, network]) => [network, chainId]),
)

// Helper function to get chainId from Onramper network
export const getChainIdFromOnramperNetwork = (network: string): ChainId | undefined => {
  return ONRAMPER_NETWORK_TO_CHAIN_ID[network]
}

// Helper function to get Onramper network from chainId
export const getOnramperNetworkFromChainId = (chainId: ChainId): string | undefined => {
  return CHAIN_ID_TO_ONRAMPER_NETWORK[chainId]
}
