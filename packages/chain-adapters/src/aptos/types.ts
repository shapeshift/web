export type Account = {
  tokens: Token[]
}

export type Token = {
  assetId: string
  balance: string
  symbol: string
  name: string
  precision: number
}

export type FeeData = {
  gasUnitPrice: string
  maxGasAmount: string
}

export type BuildTxInput = {
  tokenId?: string
  gasBudget?: string
  gasUnitPrice?: string
}

export type GetFeeDataInput = {
  from: string
  tokenId?: string
}
