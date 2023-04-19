import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Trade } from '@shapeshiftoss/swapper'

export type OneInchQuoteApiInput = {
  fromTokenAddress: string
  toTokenAddress: string
  amount: string
}

export type OneInchSwapApiInput = OneInchQuoteApiInput & {
  slippage: number
  referrerAddress: string
  allowPartialFill: boolean
  // gasLimit: number
  // gasPrice: number
}

export type OneInchAllowanceApiInput = {
  tokenAddress: string
  walletAddress: string
}

export type OneInchAllowanceResponse = {
  allowance: string
}

export type OneInchSpenderResponse = {
  address: string
}

export type OneInchTokenResponse = {
  symbol: string
  name: string
  address: string
  decimals: number
  logoURI: string
}

export type OneInchQuoteResponse = OneInchBaseResponse & {
  estimatedGas: string
}

export type OneInchSwapResponse = OneInchBaseResponse & {
  tx: {
    from: string
    to: string
    data: string
    value: string
    gasPrice: string
    gas: string
  }
}

export type OneInchBaseResponse = {
  fromToken: OneInchTokenResponse
  toToken: OneInchTokenResponse
  toTokenAmount: string
  fromTokenAmount: string
}

export type OneInchSwapperDeps = {
  apiUrl: string
}

export interface OneInchTrade<T extends EvmChainId> extends Trade<T> {
  txData: string
}
