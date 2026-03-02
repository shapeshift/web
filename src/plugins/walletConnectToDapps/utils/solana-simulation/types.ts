export type SolanaTokenInfo = {
  mint: string
  symbol: string
  name: string
  icon: string
  decimals: number
}

export type SolanaBalanceChange = {
  type: 'send' | 'receive'
  amount: string
  isNativeAsset: boolean
  tokenInfo: SolanaTokenInfo
}

export type SolanaSimulationResult = {
  success: boolean
  error?: string
  balanceChanges: SolanaBalanceChange[]
  unitsConsumed?: number
}
