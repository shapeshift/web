import type { ChainId } from '@shapeshiftoss/caip'
import { bobChainId, btcChainId, ethChainId, baseChainId, berachainChainId, unichainChainId, seiChainId, optimismChainId, avalancheChainId, sonicChainId, bscChainId, soneiumChainId, telosChainId, swellChainId } from '@shapeshiftoss/caip'
import type { Address } from 'viem'

export const BOB_GATEWAY_BASE_URL = 'https://gateway-api-mainnet.gobob.xyz'

/**
 * Chain name strings expected by the BOB Gateway API.
 * BOB Gateway internally calls BTC→EVM flows "onramp" and EVM→BTC flows "offramp",
 * but we avoid those terms in our codebase to prevent confusion with fiat on/off-ramps.
 * We use btcToEvm / evmToBtc terminology instead.
 * See: https://docs.gobob.xyz/gateway/integration
 */

// in UI code we map gateway chain to specific %chain%.name from `viem/chains`
export const BOB_GATEWAY_CHAIN_NAME = {
  bitcoin: 'bitcoin',
  bob: 'bob',
  ethereum: 'ethereum',
  base: 'base',
  bera: 'bera',
  unichain: 'unichain',
  avalanche: 'avalanche',
  sonic: 'sonic',
  bsc: 'bsc',
  soneium: 'soneium',
  telos: 'telos',
  swell: 'swell',
  optimism: 'optimism',
  sei: 'sei',
  arbitrum: 'arbitrum',
} as const

type ValueOf<T> = T[keyof T]

export type BobGatewayChainName = ValueOf<typeof BOB_GATEWAY_CHAIN_NAME>

export const CHAIN_ID_TO_BOB_GATEWAY_CHAIN_NAME = {
  [btcChainId]: BOB_GATEWAY_CHAIN_NAME.bitcoin,
  [bobChainId]: BOB_GATEWAY_CHAIN_NAME.bob,
  [ethChainId]: BOB_GATEWAY_CHAIN_NAME.ethereum,
  [baseChainId]: BOB_GATEWAY_CHAIN_NAME.base,
  [berachainChainId]: BOB_GATEWAY_CHAIN_NAME.bera,
  [unichainChainId]: BOB_GATEWAY_CHAIN_NAME.unichain,
  [avalancheChainId]: BOB_GATEWAY_CHAIN_NAME.avalanche,
  [sonicChainId]: BOB_GATEWAY_CHAIN_NAME.sonic,
  [bscChainId]: BOB_GATEWAY_CHAIN_NAME.bsc,
  [soneiumChainId]: BOB_GATEWAY_CHAIN_NAME.soneium,
  [telosChainId]: BOB_GATEWAY_CHAIN_NAME.telos,
  [swellChainId]: BOB_GATEWAY_CHAIN_NAME.swell,
  [optimismChainId]: BOB_GATEWAY_CHAIN_NAME.optimism,
  [seiChainId]: BOB_GATEWAY_CHAIN_NAME.sei,
} as const satisfies Partial<Record<ChainId, BobGatewayChainName>>

// Supported chain IDs for PR 1 (BTC ↔ BOB). LayerZero cross-chain routes are SS-5639.
export const BOB_GATEWAY_SUPPORTED_CHAIN_IDS = [
  btcChainId,
  bobChainId,
  ethChainId,
  baseChainId,
  berachainChainId,
  unichainChainId,
  avalancheChainId,
  sonicChainId,
  bscChainId,
  soneiumChainId,
  telosChainId,
  swellChainId,
  optimismChainId,
  seiChainId,
] as const
export type BobGatewaySupportedChainId = (typeof BOB_GATEWAY_SUPPORTED_CHAIN_IDS)[number]

// not sure about correctness of this value
export const BOB_GATEWAY_AFFILIATE_BPS = 5

// BOB Gateway represents native BTC as the zero address
export const BTC_TOKEN_ADDRESS: Address = '0x0000000000000000000000000000000000000000'

// Dummy EVM address used for rate queries when no wallet is connected.
// Same pattern as NEAR Intents and other deposit-to-address swappers.
export const DUMMY_EVM_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address

// Dummy BTC address used for rate queries from an EVM chain to BTC
export const DUMMY_BTC_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'

// Default slippage: 0.5% in ShapeShift decimal form
export const DEFAULT_BOB_GATEWAY_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005'

/**
 * Converts ShapeShift decimal slippage (0.005 = 0.5%) to BOB Gateway basis points (50 = 0.5%).
 * The BOB Gateway API /v1/get-quote takes slippage in basis points.
 * Source: https://gateway-api-mainnet.gobob.xyz/api-doc.json
 */
export const decimalSlippageToBobBps = (slippageDecimal: string): string => {
  return String(Math.round(parseFloat(slippageDecimal) * 10_000))
}
