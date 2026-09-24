import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  berachainChainId,
  bobChainId,
  bscChainId,
  btcChainId,
  ethChainId,
  hyperEvmChainId,
  plasmaChainId,
  polygonChainId,
  robinhoodChainId,
  seiChainId,
  sonicChainId,
  tronChainId,
  unichainChainId,
} from '@shapeshiftoss/caip'
import type { Address } from 'viem'

export const BOB_GATEWAY_BASE_URL = 'https://gateway-api-mainnet.gobob.xyz'

// Chain name strings expected by the BOB Gateway API
// https://gateway-api-mainnet.gobob.xyz/v4/get-routes
export const chainIdToBobGatewayChainName = {
  [arbitrumChainId]: 'arbitrum',
  [avalancheChainId]: 'avalanche',
  [baseChainId]: 'base',
  [berachainChainId]: 'bera',
  [btcChainId]: 'bitcoin',
  [bobChainId]: 'bob',
  [bscChainId]: 'bsc',
  [ethChainId]: 'ethereum',
  [seiChainId]: 'sei',
  [sonicChainId]: 'sonic',
  [unichainChainId]: 'unichain',
  [plasmaChainId]: 'plasma',
  [polygonChainId]: 'polygon',
  [hyperEvmChainId]: 'hyperevm',
  [robinhoodChainId]: 'robinhood',
  [tronChainId]: 'tron',
} as const

export const bobGatewayChainNameToChainId = Object.fromEntries(
  Object.entries(chainIdToBobGatewayChainName).map(([chainId, chainName]) => [chainName, chainId]),
) as Record<BobGatewayChainName, ChainId>

export type BobGatewayChainName =
  (typeof chainIdToBobGatewayChainName)[keyof typeof chainIdToBobGatewayChainName]

export const DUMMY_EVM_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address
export const DUMMY_BTC_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'

export const BOB_GATEWAY_TOKENSWAP_DEFAULT_GAS_LIMIT = '350000' // EVM→EVM
export const BOB_GATEWAY_OFFRAMP_DEFAULT_GAS_LIMIT = '550000' // EVM→BTC
// AllowanceHolder exec measured on mainnet: rates price it before an order exists, token quotes without their allowance fall back to it
export const BOB_GATEWAY_TRON_DEFAULT_ENERGY = '420000'
export const BOB_GATEWAY_TRON_DEFAULT_BANDWIDTH_BYTES = 4000

// https://docs.gobob.xyz/api-reference/v2/get-a-gateway-quote#parameter-slippage
export const decimalSlippageToBobBps = (slippageDecimal: string): string => {
  return String(Math.round(parseFloat(slippageDecimal) * 10_000))
}
