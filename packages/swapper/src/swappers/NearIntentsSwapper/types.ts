import { KnownChainIds } from '@shapeshiftoss/types'

// Re-export SDK types for convenience
export type {
  QuoteRequest,
  QuoteResponse,
  GetExecutionStatusResponse,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript'

// Supported EVM chains (verified from docs)
export const nearIntentsSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
  // TODO: Verify these are supported by calling /v0/tokens
  // KnownChainIds.AvalancheMainnet,
  // KnownChainIds.OptimismMainnet,
] as const

export type NearIntentsSupportedChainId = (typeof nearIntentsSupportedChainIds)[number]

// Chain ID mapping to NEAR Intents chain names
export const chainIdToNearIntentsChain: Record<NearIntentsSupportedChainId, string> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.ArbitrumMainnet]: 'arb',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.BnbSmartChainMainnet]: 'bnb',
  [KnownChainIds.PolygonMainnet]: 'pol',
  [KnownChainIds.GnosisMainnet]: 'gnosis',
  // TODO: Add when verified
  // [KnownChainIds.AvalancheMainnet]: 'avax',
  // [KnownChainIds.OptimismMainnet]: 'op',
}

// Asset ID format: "blockchain.contractAddress"
// Example: "eth.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" for USDC on Ethereum
export const getNearIntentsAssetId = (blockchain: string, contractAddress: string): string => {
  return `${blockchain}.${contractAddress.toLowerCase()}`
}

// Native token marker (used for ETH, MATIC, etc.)
export const NEAR_INTENTS_NATIVE_MARKER = '0x0000000000000000000000000000000000000000'

// Dummy address for rate quotes (when no wallet connected)
// Using same approach as Bebop - Vitalik's address
export const NEAR_INTENTS_DUMMY_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

// CRITICAL: appFees recipient parameter ONLY accepts NEAR addresses
// From research: "Fee recipients (appFees[].recipient) exclusively accept NEAR account IDs"
// This is different from swap recipient which accepts EVM/Solana/etc.
// Fee collection happens natively on NEAR regardless of swap chains
//
// Examples of VALID fee recipients:
// - "alice.near" (named account)
// - "sub.parent.near" (subaccount)
// - "c6d7058a1ce15260..." (implicit account, 64 hex chars)
//
// Examples of INVALID fee recipients:
// - "0x553e771500f2d7..." (EVM address - NOT SUPPORTED)
// - "13QkxhNMrTPxoCk..." (Solana address - NOT SUPPORTED)
//
// TODO: Get ShapeShift NEAR account for affiliate fees
// Until then, affiliate fees will be disabled in implementation
