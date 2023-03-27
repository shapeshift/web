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
  isPaused: boolean
}

export const baseUrl = 'https://api.idle.finance/'
export const apiKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IkFwcDIiLCJpYXQiOjE2NzAyMzc1Mjd9.pf4YYdBf_Lf6P2_oKZ5r63UMd6R44p9h5ybPprtJmT4'
