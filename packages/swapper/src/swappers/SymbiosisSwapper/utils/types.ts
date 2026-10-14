import type {
  GetEvmTradeQuoteInput,
  GetEvmTradeRateInput,
  GetTronTradeQuoteInput,
  GetTronTradeRateInput,
} from '../../../types'

export type SymbiosisTradeQuoteInput = GetEvmTradeQuoteInput | GetTronTradeQuoteInput
export type SymbiosisTradeRateInput = GetEvmTradeRateInput | GetTronTradeRateInput

export type SymbiosisToken = {
  chainId: number
  address: string
  decimals: number
  symbol: string
}

export type SymbiosisTokenAmount = SymbiosisToken & { amount: string }

export type SymbiosisQuoteRequest = {
  tokenAmountIn: Omit<SymbiosisTokenAmount, 'symbol'>
  tokenOut: Omit<SymbiosisToken, 'symbol'>
  from: string
  to: string
  slippage: number
  disabledProviders: string
  partnerAddress?: string
}

export type SymbiosisFee = {
  provider: string
  description?: string
  value: SymbiosisTokenAmount
}

export type SymbiosisEvmTx = {
  chainId: number
  to: string
  data: string
  value?: string
}

export type SymbiosisTronTx = {
  chainId: number
  from: string
  to: string
  data: string
  value?: string
  feeLimit: number
  functionSelector?: string
}

export type SymbiosisSwapTx =
  | { type: 'evm'; tx: SymbiosisEvmTx }
  | { type: 'tron'; tx: SymbiosisTronTx }

export type SymbiosisQuoteResponse = SymbiosisSwapTx & {
  kind: string
  labels: string[]
  approveTo?: string
  tokenAmountOut: SymbiosisTokenAmount
  tokenAmountOutMin: SymbiosisTokenAmount
  fees: SymbiosisFee[]
  estimatedTime: number
}

export type SymbiosisErrorResponse = {
  code: number
  message: string
}

export enum SymbiosisStatusCode {
  NotFound = -1,
  Success = 0,
  Pending = 1,
  Stuck = 2,
  Reverted = 3,
}

export type SymbiosisTxResponse = {
  status: { code: SymbiosisStatusCode; text: string }
  tx?: { hash?: string; chainId: number }
  txIn?: { hash?: string; chainId: number }
  transitTokenSent?: SymbiosisTokenAmount
}
