import { tronChainId } from '@shapeshiftoss/caip'

export const SUNIO_SUPPORTED_CHAIN_IDS = [tronChainId] as const

// NOTE: This domain looks suspicious, but it's the official Sun.io backend API
// Verified by inspecting XHR requests from sun.io's own frontend application
// The sun.io frontend makes requests to this endpoint with origin: https://sun.io
export const SUNIO_API_BASE_URL = 'https://rot.endjgfsv.link'

// Smart Exchange Router - aggregates liquidity across V1, V2, V3, PSM, and SunCurve
// This is the current mainnet router that sun.io's frontend uses
export const SUNIO_SMART_ROUTER_CONTRACT = 'TCFNp179Lg46D16zKoumd4Poa2WFFdtqYj' as const

export const DEFAULT_SLIPPAGE_PERCENTAGE = '0.005'

// Conservative energy fallbacks for when we can't simulate a swap (no address, or the
// simulation reverts pre-approval for TRC20 sells). Sized to observed worst-case routes:
// native TRX sells run ~180-245k energy, TRC20 sells ~350-415k (the extra transferFrom token pull).
export const SUNIO_FALLBACK_SWAP_ENERGY_NATIVE = 250_000
export const SUNIO_FALLBACK_SWAP_ENERGY_TRC20 = 430_000

export const SUNIO_DEX_TYPES =
  'PSM,CURVE,CURVE_COMBINATION,WTRX,SUNSWAP_V1,SUNSWAP_V2,SUNSWAP_V3' as const

// Native TRX token address (used when assetId is not a TRC-20 token)
export const SUNIO_TRON_NATIVE_ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb' as const
