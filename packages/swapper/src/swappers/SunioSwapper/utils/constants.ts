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

export const SUNIO_DEX_TYPES = 'SUNSWAP_V1,SUNSWAP_V2,SUNSWAP_V3,PSM,CURVE' as const
