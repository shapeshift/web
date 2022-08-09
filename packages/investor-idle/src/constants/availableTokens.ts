/**
 * Annual Percentage Yield of a particular vault.
 */
export interface Apy {
  net_apy: number
}

export interface IdleVault {
  apr: number
  apy?: Apy
  tvl: number
  address: string
  strategy: string
  poolName: string
  tokenName: string
  cdoAddress?: string
  protocolName: string
  pricePerShare: number
  underlyingTVL: number
  underlyingAddress: string
  externalIntegration: boolean
}

export const baseUrl = 'https://api.idle.finance/'
export const apiKey = 'bPrtC2bfnAvapyXLgdvzVzW8u8igKv6E'
