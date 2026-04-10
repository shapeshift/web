import type { ChainId } from '@shapeshiftoss/caip'
import { bobChainId, btcChainId } from '@shapeshiftoss/caip'
import type { Address } from 'viem'

export const BOB_GATEWAY_BASE_URL = 'https://gateway-api-mainnet.gobob.xyz'

/**
 * Chain name strings expected by the BOB Gateway API.
 * BOB Gateway internally calls BTC→EVM flows "onramp" and EVM→BTC flows "offramp",
 * but we avoid those terms in our codebase to prevent confusion with fiat on/off-ramps.
 * We use btcToEvm / evmToBtc terminology instead.
 * See: https://docs.gobob.xyz/gateway/integration
 */
export const BOB_GATEWAY_CHAIN_NAME = {
  bitcoin: 'bitcoin',
  bob: 'bob',
} as const

export type BobGatewayChainName =
  (typeof BOB_GATEWAY_CHAIN_NAME)[keyof typeof BOB_GATEWAY_CHAIN_NAME]

export const CHAIN_ID_TO_BOB_GATEWAY_CHAIN_NAME: Partial<Record<ChainId, BobGatewayChainName>> = {
  [btcChainId]: BOB_GATEWAY_CHAIN_NAME.bitcoin,
  [bobChainId]: BOB_GATEWAY_CHAIN_NAME.bob,
}

// Supported chain IDs for PR 1 (BTC ↔ BOB). LayerZero cross-chain routes are SS-5639.
export const BOB_GATEWAY_SUPPORTED_CHAIN_IDS = [btcChainId, bobChainId] as const
export type BobGatewaySupportedChainId = (typeof BOB_GATEWAY_SUPPORTED_CHAIN_IDS)[number]

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
