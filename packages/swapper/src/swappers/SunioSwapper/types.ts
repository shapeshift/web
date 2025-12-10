import type { tronChainId } from '@shapeshiftoss/caip'

export type SunioSupportedChainId = typeof tronChainId

export type SunioRoute = {
  amountIn: string
  amountOut: string
  inUsd: string
  outUsd: string
  impact: string
  fee: string
  tokens: string[]
  symbols: string[]
  poolFees: string[]
  poolVersions: string[]
  stepAmountsOut: string[]
}

export type SunioQuoteResponse = {
  code: number
  message: string
  data: SunioRoute[]
}

export const SUNIO_SUPPORTED_DEX_TYPES = [
  'SUNSWAP_V1',
  'SUNSWAP_V2',
  'SUNSWAP_V3',
  'PSM',
  'CURVE',
  'CURVE_COMBINATION',
  'WTRX',
] as const

export type SunioDexType = (typeof SUNIO_SUPPORTED_DEX_TYPES)[number]
