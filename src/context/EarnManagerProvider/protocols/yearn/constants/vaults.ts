export type YearnVault = {
  vaultAddress: string
  routerAddress: string
  decimals: number
  symbol: string
  depositToken: string
}

export const vaults: YearnVault[] = [
  {
    vaultAddress: '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9',
    routerAddress: '',
    decimals: 6,
    symbol: 'yUSDC',
    depositToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
  }
]
