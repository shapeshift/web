import { KnownChainIds } from '@shapeshiftoss/types'

export { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript'
export type {
  QuoteResponse,
  GetExecutionStatusResponse,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript'
export const nearIntentsSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.AvalancheMainnet, // Verified ✅
  KnownChainIds.OptimismMainnet, // Verified ✅
] as const

export type NearIntentsSupportedChainId = (typeof nearIntentsSupportedChainIds)[number]

export const chainIdToNearIntentsChain: Record<NearIntentsSupportedChainId, string> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.ArbitrumMainnet]: 'arb',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.BnbSmartChainMainnet]: 'bnb',
  [KnownChainIds.PolygonMainnet]: 'pol',
  [KnownChainIds.GnosisMainnet]: 'gnosis',
  [KnownChainIds.AvalancheMainnet]: 'avax',
  [KnownChainIds.OptimismMainnet]: 'op',
}

export const getNearIntentsAsset = (blockchain: string, contractAddress: string): string => {
  return `${blockchain}.${contractAddress.toLowerCase()}`
}

export const NEAR_INTENTS_NATIVE_EVM_MARKER = '0x0000000000000000000000000000000000000000'

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
